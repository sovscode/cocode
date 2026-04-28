import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ViewMode } from "./answer";

export default function ModeSelect(props: {
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  hasAChosenAnswer: boolean;
}) {
  return (
    <Select value={props.viewMode} onValueChange={props.onViewModeChange}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue placeholder="Select a mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="statedQuestion">Stated question</SelectItem>
          <SelectItem value="userAnswer">Your answer</SelectItem>
          <SelectItem value="chosenAnswer" disabled={!props.hasAChosenAnswer}>
            Chosen answer
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
