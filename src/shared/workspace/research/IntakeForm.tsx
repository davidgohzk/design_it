import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { FREQUENCIES, INTERVIEW_BANDS, completeIntake, intakeProblems } from "../../../assessment/intake";
import type { Frequency, Intake } from "../../../assessment/intake";
import { saveIntake } from "./intakeStorage";

const numberOrUndefined = (text: string) => (text.trim() === "" ? undefined : Number(text));

/** Research mode only, before the warm-up: a few questions about experience, exported with the session. */
export function IntakeForm({ onDone }: { onDone: (intake: Intake) => void }) {
  const [form, setForm] = useState<Partial<Intake>>({});
  const [tried, setTried] = useState(false);
  const problems = intakeProblems(form);
  const set = <K extends keyof Intake>(key: K, value: Intake[K] | undefined) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    const intake = completeIntake(form);
    if (!intake) return;
    saveIntake(intake);
    onDone(intake);
  };

  const frequency = (key: "aiForCoding" | "githubPullRequests" | "vsCode", label: string) => (
    <TextField select label={label} value={form[key] ?? ""} onChange={(event) => set(key, event.target.value as Frequency)} fullWidth>
      {FREQUENCIES.map((value) => (
        <MenuItem key={value} value={value}>
          {value}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <form className="intake-form" onSubmit={submit} noValidate>
      <Typography variant="h5">Before you start</Typography>
      <Typography color="text.secondary">
        A few questions about your experience. They help the study compare groups; they don't change your results.
      </Typography>
      <TextField
        label="Years of full-time software work"
        type="number"
        value={form.yearsFullTime ?? ""}
        onChange={(event) => set("yearsFullTime", numberOrUndefined(event.target.value))}
        slotProps={{ htmlInput: { min: 0, step: 1 } }}
      />
      <FormControl>
        <FormLabel>Real client or stakeholder interviews you've run</FormLabel>
        <RadioGroup row value={form.clientInterviews ?? ""} onChange={(event) => set("clientInterviews", event.target.value as Intake["clientInterviews"])}>
          {INTERVIEW_BANDS.map((band) => (
            <FormControlLabel key={band} value={band} control={<Radio />} label={band} />
          ))}
        </RadioGroup>
      </FormControl>
      <FormControl>
        <FormLabel>Have you done requirements work (gathering or writing requirements)?</FormLabel>
        <RadioGroup row value={form.requirementsWork === undefined ? "" : String(form.requirementsWork)} onChange={(event) => set("requirementsWork", event.target.value === "true")}>
          <FormControlLabel value="true" control={<Radio />} label="Yes" />
          <FormControlLabel value="false" control={<Radio />} label="No" />
        </RadioGroup>
      </FormControl>
      {form.requirementsWork && (
        <TextField
          label="Years of requirements work"
          type="number"
          value={form.requirementsYears ?? ""}
          onChange={(event) => set("requirementsYears", numberOrUndefined(event.target.value))}
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
        />
      )}
      <TextField
        label="System design interviews you've done (as a candidate)"
        type="number"
        value={form.systemDesignInterviews ?? ""}
        onChange={(event) => set("systemDesignInterviews", numberOrUndefined(event.target.value))}
        slotProps={{ htmlInput: { min: 0, step: 1 } }}
      />
      <div className="intake-row">
        {frequency("aiForCoding", "AI for coding")}
        {frequency("githubPullRequests", "GitHub pull requests")}
        {frequency("vsCode", "VS Code")}
      </div>
      <FormControl>
        <FormLabel>How familiar are you with community centres or booking desks? (1 = not at all, 5 = very)</FormLabel>
        <RadioGroup row value={form.bookingFamiliarity ?? ""} onChange={(event) => set("bookingFamiliarity", Number(event.target.value) as Intake["bookingFamiliarity"])}>
          {[1, 2, 3, 4, 5].map((value) => (
            <FormControlLabel key={value} value={value} control={<Radio />} label={String(value)} />
          ))}
        </RadioGroup>
      </FormControl>
      {tried && problems.length > 0 && (
        <Alert severity="warning">
          Please answer: {problems.join(" ")}
        </Alert>
      )}
      <Button type="submit" variant="contained">
        Start the warm-up
      </Button>
    </form>
  );
}
