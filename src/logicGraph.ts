import type {
  AIReviewResult,
  CaseReviewFact,
  ChatMessage,
  LogicGraphData,
  LogicGraphLink,
  LogicGraphNode,
  LogicHealth,
  LogicStage,
} from "./types";

export type LogicHealthFilter = "all" | "grounded" | "gaps";

const STAGE_X: Record<LogicStage, number> = {
  source: -540,
  chat: -360,
  subjective: -180,
  objective: 0,
  assessment: 180,
  plan: 360,
  design: 540,
};
const STAGE_ORDER = Object.keys(STAGE_X) as LogicStage[];

const hashNumber = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const positionedNode = (
  node: Omit<LogicGraphNode, "fx" | "fy" | "x" | "y">,
): LogicGraphNode => {
  const seed = hashNumber(node.id);
  const x = STAGE_X[node.stage];
  return {
    ...node,
    fx: x,
    fy: 0,
    x,
    y: ((seed % 1000) / 1000 - 0.5) * 170,
  };
};

const shortLabel = (value: string, maximum = 44) =>
  value.length <= maximum ? value : `${value.slice(0, maximum - 1).trimEnd()}…`;

const addUniqueLink = (
  links: LogicGraphLink[],
  link: Omit<LogicGraphLink, "id">,
) => {
  const id = `${link.relation}:${link.source}:${link.target}`;
  if (!links.some((existing) => existing.id === id)) links.push({ ...link, id });
};

const chatExchangeText = (messages: ChatMessage[], clientIndex: number) => {
  const client = messages[clientIndex];
  const question = messages[clientIndex - 1]?.role === "user"
    ? messages[clientIndex - 1].content
    : undefined;
  return {
    label: question ? shortLabel(question) : "Opening client statement",
    text: question
      ? `Question: ${question}\n\nClient: ${client?.content ?? ""}`
      : client?.content ?? "",
    sourceLabel: question ? `Chat #${clientIndex}–${clientIndex + 1}` : `Chat #${clientIndex + 1}`,
  };
};

const normalizeReportText = (value: string) =>
  value.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();

const soapStageFromHeading = (heading: string): LogicStage => {
  const normalized = heading.trim().toLowerCase();
  if (/^s\s*-\s*subjective/.test(normalized)) return "subjective";
  if (/^o\s*-\s*objective/.test(normalized)) return "objective";
  if (/^a\s*-\s*assessment/.test(normalized)) return "assessment";
  if (/^p\s*-\s*plan/.test(normalized)) return "plan";
  return "design";
};

const reportStageForExcerpt = (reportMarkdown: string, excerpt: string): LogicStage => {
  const sections: Array<{ stage: LogicStage; text: string[] }> = [];
  let current = { stage: "design" as LogicStage, text: [] as string[] };
  sections.push(current);
  for (const line of reportMarkdown.split("\n")) {
    const heading = line.match(/^###\s+(.+)$/)?.[1];
    if (heading) {
      current = { stage: soapStageFromHeading(heading), text: [] };
      sections.push(current);
    } else {
      current.text.push(line);
    }
  }
  const needle = normalizeReportText(excerpt);
  return sections.find((section) => normalizeReportText(section.text.join("\n")).includes(needle))
    ?.stage ?? "design";
};

const reasoningStage = (kind: AIReviewResult["reasoning"][number]["kind"]): LogicStage => {
  if (kind === "assessment") return "assessment";
  if (kind === "plan") return "plan";
  return "design";
};

export function buildLogicGraph(
  facts: readonly CaseReviewFact[],
  messages: ChatMessage[],
  review: AIReviewResult,
  reportMarkdown: string,
): LogicGraphData {
  const nodes: LogicGraphNode[] = [];
  const links: LogicGraphLink[] = [];
  const nodeIds = new Set<string>();
  const addNode = (node: Omit<LogicGraphNode, "fx" | "fy" | "x" | "y">) => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(positionedNode(node));
  };

  const coverageByFact = new Map(review.coverage.map((finding) => [finding.factId, finding]));
  for (const fact of facts) {
    const finding = coverageByFact.get(fact.id);
    const health: LogicHealth = finding?.status === "elicited"
      ? "grounded"
      : finding?.status === "assumed"
        ? "assumed"
        : "gap";
    addNode({
      id: `source-fact-${fact.id}`,
      kind: "source",
      stage: "source",
      health,
      label: fact.label,
      text: fact.description,
      detail: finding?.rationale ?? "Authored case fact.",
      sourceLabel: "Case author checklist",
    });
  }

  const materialChatIndexes = new Set<number>();
  for (const finding of review.coverage) {
    finding.chatMessageIndexes.forEach((index) => materialChatIndexes.add(index));
  }
  for (const claim of review.grounding.claims) {
    if (claim.reference?.source === "chat" && claim.reference.messageIndex !== undefined) {
      const message = messages[claim.reference.messageIndex];
      if (message?.role === "assistant") materialChatIndexes.add(claim.reference.messageIndex);
    }
  }
  for (const messageIndex of materialChatIndexes) {
    const exchange = chatExchangeText(messages, messageIndex);
    addNode({
      id: `chat-exchange-${messageIndex}`,
      kind: "chat",
      stage: "chat",
      health: "grounded",
      label: exchange.label,
      text: exchange.text,
      detail: "Evidence-bearing interview exchange.",
      sourceLabel: exchange.sourceLabel,
    });
  }

  for (const claim of review.grounding.claims) {
    addNode({
      id: claim.id,
      kind: "report",
      stage: reportStageForExcerpt(reportMarkdown, claim.reportExcerpt),
      health: claim.grounded ? "grounded" : "gap",
      label: shortLabel(claim.claim),
      text: claim.reportExcerpt,
      detail: claim.rationale,
      sourceLabel: "SOAP report",
    });

    const reference = claim.reference;
    if (reference?.source === "chat" && reference.messageIndex !== undefined) {
      addUniqueLink(links, {
        source: `chat-exchange-${reference.messageIndex}`,
        target: claim.id,
        relation: "cited_by",
        health: claim.grounded ? "grounded" : "gap",
        detail: claim.grounded
          ? "The report claim cites this client exchange."
          : claim.rationale,
      });
    } else if (reference?.source === "brief") {
      const sourceId = `source-brief-${hashNumber(reference.excerpt).toString(36)}`;
      addNode({
        id: sourceId,
        kind: "source",
        stage: "source",
        health: reference.valid ? "grounded" : "gap",
        label: shortLabel(reference.label || "Case brief evidence"),
        text: reference.excerpt,
        detail: reference.invalidReason ?? "Explicit evidence from the case brief.",
        sourceLabel: "Case brief",
      });
      addUniqueLink(links, {
        source: sourceId,
        target: claim.id,
        relation: "cited_by",
        health: claim.grounded ? "grounded" : "gap",
        detail: claim.grounded ? "The report claim cites this brief evidence." : claim.rationale,
      });
    }
  }

  for (const finding of review.coverage) {
    const sourceId = `source-fact-${finding.factId}`;
    for (const messageIndex of finding.chatMessageIndexes) {
      addUniqueLink(links, {
        source: sourceId,
        target: `chat-exchange-${messageIndex}`,
        relation: "elicited_as",
        health: finding.status === "elicited" ? "grounded" : "assumed",
        detail: finding.rationale,
      });
    }
    if (finding.status === "assumed") {
      for (const reportClaimId of finding.reportClaimIds) {
        addUniqueLink(links, {
          source: sourceId,
          target: reportClaimId,
          relation: "appears_as",
          health: "assumed",
          detail: "The report contains this case fact without eliciting it in the interview.",
        });
      }
    }
  }

  review.grounding.omissions.forEach((omission, index) => {
    const sourceId = `source-omission-${index}`;
    const chatId = `chat-omission-${index}-${omission.messageIndex}`;
    const exchange = chatExchangeText(messages, omission.messageIndex);
    addNode({
      id: sourceId,
      kind: "source",
      stage: "source",
      health: "gap",
      label: shortLabel(omission.fact),
      text: omission.fact,
      detail: omission.rationale,
      sourceLabel: "Client-known fact",
    });
    addNode({
      id: chatId,
      kind: "chat",
      stage: "chat",
      health: "gap",
      label: exchange.label,
      text: exchange.text,
      detail: "This exchange contains a client fact that does not continue into the report.",
      sourceLabel: exchange.sourceLabel,
    });
    addUniqueLink(links, {
      source: sourceId,
      target: chatId,
      relation: "elicited_as",
      health: "grounded",
      detail: "The client stated this fact, but the chain stops before the report.",
    });
  });

  const claimsById = new Map(review.grounding.claims.map((claim) => [claim.id, claim]));
  const reasoningHealthById = new Map<string, LogicHealth>();
  for (const reasoning of review.reasoning) {
    const dependencies = reasoning.dependsOnClaimIds
      .map((id) => claimsById.get(id))
      .filter((claim) => claim !== undefined);
    const upstreamHealth = reasoning.dependsOnReasoningIds.map(
      (id) => reasoningHealthById.get(id) ?? "gap",
    );
    const health: LogicHealth = dependencies.length + upstreamHealth.length > 0
      && dependencies.every((claim) => claim.grounded)
      && upstreamHealth.every((value) => value === "grounded")
      ? "grounded"
      : "gap";
    reasoningHealthById.set(reasoning.id, health);
    addNode({
      id: reasoning.id,
      kind: "logic",
      stage: reasoningStage(reasoning.kind),
      health,
      label: shortLabel(reasoning.statement),
      text: reasoning.reportExcerpt,
      detail: reasoning.rationale,
      sourceLabel: `${reasoning.section} · ${reasoning.kind}`,
    });
    for (const claim of dependencies) {
      addUniqueLink(links, {
        source: claim.id,
        target: reasoning.id,
        relation: "informs",
        health: claim.grounded ? "grounded" : "gap",
        detail: reasoning.rationale,
      });
    }
    for (const dependencyId of reasoning.dependsOnReasoningIds) {
      const dependency = review.reasoning.find((item) => item.id === dependencyId);
      if (!dependency) continue;
      const dependencyHealth = reasoningHealthById.get(dependencyId) ?? "gap";
      addUniqueLink(links, {
        source: dependencyId,
        target: reasoning.id,
        relation: "develops_into",
        health: dependencyHealth === "grounded" && health === "grounded" ? "grounded" : "gap",
        detail: `${dependency.section} reasoning develops into ${reasoning.section}.`,
      });
    }
  }

  return layoutLogicGraph({
    nodes,
    links: links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target)),
  });
}

export function layoutLogicGraph(graph: LogicGraphData): LogicGraphData {
  const nodes = graph.nodes.map((node) => ({ ...node }));
  const links = graph.links.map((link) => ({ ...link }));
  const layers = new Map<LogicStage, LogicGraphNode[]>();
  for (const stage of STAGE_ORDER) {
    layers.set(
      stage,
      nodes
        .filter((node) => node.stage === stage)
        .sort((left, right) => hashNumber(left.id) - hashNumber(right.id) || left.id.localeCompare(right.id)),
    );
  }

  const reorderLayer = (stage: LogicStage, direction: "incoming" | "outgoing") => {
    const layer = layers.get(stage) ?? [];
    const ranks = new Map<string, number>();
    for (const candidateLayer of layers.values()) {
      const denominator = Math.max(1, candidateLayer.length - 1);
      candidateLayer.forEach((node, index) => ranks.set(node.id, index / denominator));
    }
    const previousOrder = new Map(layer.map((node, index) => [node.id, index]));
    const barycenter = (node: LogicGraphNode) => {
      const neighbors = links.flatMap((link) => {
        if (direction === "incoming" && link.target === node.id) return [link.source];
        if (direction === "outgoing" && link.source === node.id) return [link.target];
        return [];
      });
      if (neighbors.length === 0) return null;
      return neighbors.reduce((sum, id) => sum + (ranks.get(id) ?? 0.5), 0) / neighbors.length;
    };
    layer.sort((left, right) => {
      const leftCenter = barycenter(left);
      const rightCenter = barycenter(right);
      if (leftCenter === null && rightCenter === null) {
        return (previousOrder.get(left.id) ?? 0) - (previousOrder.get(right.id) ?? 0);
      }
      if (leftCenter === null) return 1;
      if (rightCenter === null) return -1;
      return leftCenter - rightCenter
        || (previousOrder.get(left.id) ?? 0) - (previousOrder.get(right.id) ?? 0);
    });
  };

  for (let sweep = 0; sweep < 8; sweep += 1) {
    STAGE_ORDER.slice(1).forEach((stage) => reorderLayer(stage, "incoming"));
    STAGE_ORDER.slice(0, -1).reverse().forEach((stage) => reorderLayer(stage, "outgoing"));
  }

  const verticalGap = 52;
  for (const stage of STAGE_ORDER) {
    const layer = layers.get(stage) ?? [];
    layer.forEach((node, index) => {
      const y = (index - (layer.length - 1) / 2) * verticalGap;
      node.x = STAGE_X[stage];
      node.fx = STAGE_X[stage];
      node.y = y;
      node.fy = y;
    });
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, LogicGraphLink[]>();
  const incoming = new Map<string, LogicGraphLink[]>();
  for (const link of links) {
    outgoing.set(link.source, [...(outgoing.get(link.source) ?? []), link]);
    incoming.set(link.target, [...(incoming.get(link.target) ?? []), link]);
  }
  for (const group of outgoing.values()) {
    group.sort((left, right) =>
      (nodesById.get(left.target)?.y ?? 0) - (nodesById.get(right.target)?.y ?? 0)
      || left.id.localeCompare(right.id));
  }
  for (const group of incoming.values()) {
    group.sort((left, right) =>
      (nodesById.get(left.source)?.y ?? 0) - (nodesById.get(right.source)?.y ?? 0)
      || left.id.localeCompare(right.id));
  }
  for (const link of links) {
    const sourceSiblings = outgoing.get(link.source) ?? [link];
    const targetSiblings = incoming.get(link.target) ?? [link];
    const sourceLane = sourceSiblings.indexOf(link) - (sourceSiblings.length - 1) / 2;
    const targetLane = targetSiblings.indexOf(link) - (targetSiblings.length - 1) / 2;
    let curvature = sourceLane * 0.08 + targetLane * 0.05;
    if ((sourceSiblings.length > 1 || targetSiblings.length > 1) && Math.abs(curvature) < 0.025) {
      curvature = hashNumber(link.id) % 2 === 0 ? 0.04 : -0.04;
    }
    link.curvature = Math.max(-0.32, Math.min(0.32, curvature));
  }
  return { nodes, links };
}

export function filterLogicGraph(
  graph: LogicGraphData,
  visibleStages: ReadonlySet<LogicStage>,
  healthFilter: LogicHealthFilter,
): LogicGraphData {
  const healthNodeIds = healthFilter === "all"
    ? new Set(graph.nodes.map((node) => node.id))
    : new Set(
        enumerateLogicChains(graph)
          .filter((chain) => {
            const ids = new Set(chain);
            const nodes = graph.nodes.filter((node) => ids.has(node.id));
            const links = graph.links.filter(
              (link) => ids.has(link.source) && ids.has(link.target),
            );
            const hasGap = nodes.some((node) => node.health === "gap" || node.health === "assumed")
              || links.some((link) => link.health === "gap" || link.health === "assumed");
            return healthFilter === "gaps" ? hasGap : !hasGap;
          })
          .flat(),
      );
  const nodes = graph.nodes.filter(
    (node) => visibleStages.has(node.stage) && healthNodeIds.has(node.id),
  );
  const ids = new Set(nodes.map((node) => node.id));
  return layoutLogicGraph({
    nodes,
    links: graph.links.filter((link) => ids.has(link.source) && ids.has(link.target)),
  });
}

export function connectedLogicNodeIds(graph: LogicGraphData, startId: string | null) {
  if (!startId) return new Set<string>();
  const connected = new Set([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift();
    for (const link of graph.links) {
      const neighbor = link.source === id ? link.target : link.target === id ? link.source : null;
      if (neighbor && !connected.has(neighbor)) {
        connected.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return connected;
}

export function listLogicChains(graph: LogicGraphData) {
  return enumerateLogicChains(graph).slice(0, 200);
}

function enumerateLogicChains(graph: LogicGraphData) {
  const incoming = new Map<string, string[]>();
  const outgoing = new Set<string>();
  for (const link of graph.links) {
    outgoing.add(link.source);
    incoming.set(link.target, [...(incoming.get(link.target) ?? []), link.source]);
  }
  const endpoints = graph.nodes.filter((node) => !outgoing.has(node.id));
  const chains: string[][] = [];
  const walk = (id: string, path: string[]) => {
    const parents = incoming.get(id) ?? [];
    if (parents.length === 0 || path.length >= 8) {
      chains.push([id, ...path]);
      return;
    }
    parents.forEach((parent) => walk(parent, [id, ...path]));
  };
  endpoints.forEach((endpoint) => walk(endpoint.id, []));
  return chains;
}
