// Every word list used by the rule-based checks, in one place so they can be tuned against
// hand-labelled messages (WP8). All entries are lowercase.

/** A message is `open` when (after any greeting) it starts with one of these. */
export const OPEN_STARTS = ["what", "why", "how", "who", "when", "where", "which", "tell me", "describe", "walk me"];

/** A message is `closed` when (after any greeting) it starts with one of these. */
export const CLOSED_STARTS = [
  "is", "are", "do", "does", "did", "can", "could", "will", "would", "should", "have", "has",
];

/** `leading`: the question suggests its own answer. */
export const LEADING_PHRASES = ["don't you", "right?", "i assume", "so you need", "isn't it"];

/** `solution_asking`: asks the client to choose the solution. */
export const SOLUTION_PHRASES = ["should we use", "do you want an app", "would an app", "what if we built"];

/** `jargon`: technical words a non-technical client may not follow. */
export const JARGON_WORDS = [
  "api", "apis", "database", "databases", "backend", "back-end", "frontend", "front-end", "server", "servers",
  "cloud", "microservice", "microservices", "sql", "nosql", "schema", "endpoint", "endpoints", "deploy",
  "deployment", "kubernetes", "docker", "cache", "caching", "queue", "crud", "rest", "json", "latency",
  "scalability", "throughput", "middleware",
];

/** `summarise_back`: the engineer checks their understanding. */
export const SUMMARISE_PHRASES = ["so to confirm", "let me summarise", "let me summarize", "if i understand", "just to check"];

/** Words that open a message without being the question: "Hi Mei!", "Thanks, ...". */
export const GREETINGS = ["hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "great", "sure", "right", "got it", "cool", "sorry"];

/** End-interview reasons, bucketed by keywords; the first bucket that matches wins. */
export const STOP_BUCKETS: [bucket: "time" | "covered" | "enough_to_start" | "client_ran_out", words: string[]][] = [
  ["time", ["time", "minutes", "clock", "running out", "late", "hurry"]],
  ["client_ran_out", ["didn't know", "doesn't know", "not sure", "nothing more", "ran out", "no more answers", "kept saying", "couldn't answer"]],
  ["enough_to_start", ["enough", "start", "begin", "ready", "good idea", "can design", "to design"]],
  ["covered", ["covered", "everything", "all i need", "all the", "asked all", "complete", "done", "finished", "no more questions"]],
];

/** Common words left out when comparing what two texts are about. */
export const STOPWORDS = new Set([
  "a", "about", "after", "again", "all", "also", "am", "an", "and", "any", "are", "as", "at", "be", "because",
  "been", "before", "being", "but", "by", "can", "could", "did", "do", "does", "doing", "don't", "for", "from",
  "get", "got", "had", "has", "have", "having", "he", "her", "here", "him", "his", "how", "i", "i'd", "i'm",
  "if", "in", "into", "is", "it", "it's", "its", "just", "know", "let", "like", "me", "more", "most", "my",
  "no", "not", "now", "of", "on", "one", "only", "or", "other", "our", "out", "really", "right", "say", "she",
  "so", "some", "still", "such", "tell", "than", "that", "that's", "the", "their", "them", "then", "there",
  "these", "they", "they're", "thing", "things", "think", "this", "those", "to", "too", "up", "us", "very",
  "was", "we", "we're", "well", "were", "what", "what's", "when", "where", "which", "while", "who", "why",
  "will", "with", "would", "yes", "you", "you're", "your",
]);
