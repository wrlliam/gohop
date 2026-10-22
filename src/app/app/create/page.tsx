import { CreateLinkForm } from "~/components/Forms/CreateLinkForm";
import { FormShell } from "~/components/Forms/FormShell";

export default function CreateLink() {
  return (
    <FormShell title="Create a new sharable link" description="Start getting paid to share your links, customise everything and see how they are doing.">
      <CreateLinkForm />
    </FormShell>
  );
}
