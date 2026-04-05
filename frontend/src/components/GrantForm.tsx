/** @format */

import { useState } from 'react';
import { VStack, HStack, Button, Input, Text } from '@chakra-ui/react';
import { Field, NativeSelect } from '@chakra-ui/react';
import type { Grant, GrantType } from '../types';

interface GrantFormProps {
  initial?: Partial<Grant> | null;
  grantTypes?: GrantType[];
  onSave: (form: Partial<Grant>) => void;
  onCancel: () => void;
}

const labelStyles = {
  fontSize: '11px',
  fontFamily: 'mono',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'gray.500',
};

export const GrantForm = ({
  initial,
  grantTypes = [],
  onSave,
  onCancel,
}: GrantFormProps) => {
  const [form, setForm] = useState<Partial<Grant>>(
    initial || {
      name: '',
      type: grantTypes[0]?.name || 'github',
      baseURL: '',
      account: '',
      secret: '',
      defaultRevokeTime: 86400,
    }
  );
  const f = (k: keyof Grant) => (v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Text {...labelStyles} mb={1}>Name</Text>
        <Input
          value={form.name || ''}
          onChange={(e) => f('name')(e.target.value)}
          placeholder="GitHub Primary"
        />
      </Field.Root>
      <Field.Root>
        <Text {...labelStyles} mb={1}>Type</Text>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={
              typeof form.type === 'object' ? form.type?.name : form.type || ''
            }
            onChange={(e) => f('type')(e.target.value)}
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
        <Text {...labelStyles} mb={1}>Base URL</Text>
        <Input
          value={form.baseURL || ''}
          onChange={(e) => f('baseURL')(e.target.value)}
          placeholder="https://api.github.com"
        />
      </Field.Root>
      <Field.Root>
        <Text {...labelStyles} mb={1}>Account</Text>
        <Input
          value={form.account || ''}
          onChange={(e) => f('account')(e.target.value)}
          placeholder="org-main"
        />
      </Field.Root>
      <Field.Root>
        <Text {...labelStyles} mb={1}>Secret Token</Text>
        <Input
          type="password"
          value={form.secret || ''}
          onChange={(e) => f('secret')(e.target.value)}
          placeholder="ghp_•••••••••••••••"
        />
      </Field.Root>
      <Field.Root>
        <Text {...labelStyles} mb={1}>Default Revoke Time (s)</Text>
        <Input
          type="number"
          value={form.defaultRevokeTime || 0}
          onChange={(e) => f('defaultRevokeTime')(+e.target.value)}
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
