import { Button } from "@/components/ui/button";
import { useSession } from "@/context/session-context";

export default function QuestionsNavigator() {
  const sessionContext = useSession();
  return (
    <div className="flex items-center justify-center gap-2">
      <p>Questions:</p>
      <div className="cursor-pointer">
        <Button variant={"outline"}>Previous</Button>
        <Button variant={"outline"}>Next</Button>
      </div>
    </div>
  );
}
