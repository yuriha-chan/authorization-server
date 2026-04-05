import { useState } from "react";
import { VStack, HStack, Button, Input } from "@chakra-ui/react";
import { Field } from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react";
import { labelText } from "./Styles";

export const GrantForm = ({ initial, grantTypes = [], onSave, onCancel }) => {
  const [form, setForm] = useState(
    initial || {
      name: "",
      type: grantTypes[0]?.name || "github",
      baseURL: "",
      account: "",
      secret: "",
      defaultRevokeTime: 86400
    }
  );
  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Field.Label sx={labelText}>Name</Field.Label>
        <Input
          value={form.name}
          onChange={(e) => f("name")(e.target.value)}
          placeholder="GitHub Primary"
        />
      </Field.Root>
      <Field.Root>
        <Field.Label sx={labelText}>Type</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={form.type?.name || form.type}
            onChange={(e) => f("type")(e.target.value)}
            fontFamily="mono"
          >
            {grantTypes.map((type) => (
              <option key={type.name} value={type.name}>
                {type.name}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Field.Root>
      <Field.Root>
        <Field.Label sx={labelText}>Base URL</Field.Label>
        <Input
          value={form.baseURL}
          onChange={(e) => f("baseURL")(e.target.value)}
          placeholder="https://api.github.com"
        />
      </Field.Root>
      <Field.Root>
        <Field.Label sx={labelText}>Account</Field.Label>
        <Input
          value={form.account}
          onChange={(e) => f("account")(e.target.value)}
          placeholder="org-main"
        />
      </Field.Root>
      <Field.Root>
        <Field.Label sx={labelText}>Secret Token</Field.Label>
        <Input
          type="password"
          value={form.secret}
          onChange={(e) => f("secret")(e.target.value)}
          placeholder="ghp_•••••••••••••••"
        />
      </Field.Root>
      <Field.Root>
        <Field.Label sx={labelText}>Default Revoke Time (s)</Field.Label>
        <Input
          type="number"
          value={form.defaultRevokeTime}
          onChange={(e) => f("defaultRevokeTime")(+e.target.value)}
        />
      </Field.Root>
      <HStack justify="flex-end" gap={2} pt={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} fontFamily="mono">
          Cancel
        </Button>
        <Button
          size="sm"
          colorPalette="brand"
          onClick={() => onSave(form)}
          fontFamily="mono"
        >
          Save
        </Button>
      </HStack>
    </VStack>
  );
};
