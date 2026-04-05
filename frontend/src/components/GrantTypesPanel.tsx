/** @format */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Button, Heading, Table, Dialog, Field, Input, IconButton, Textarea } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useDisclosure } from '@chakra-ui/react';
import { useColorModeValue } from '../hooks/useColorMode';
import type { GrantType } from '../types';

interface GrantTypeFormProps {
  initial?: Partial<GrantType> | null;
  onSave: (form: Partial<GrantType>) => void;
  onCancel: () => void;
}

const GrantTypeForm = ({ initial, onSave, onCancel }: GrantTypeFormProps) => {
  const [form, setForm] = useState<Partial<GrantType>>(
    initial || {
      name: '',
      grantCode: '',
      revokeCode: '',
      getStatusCode: '',
    }
  );
  const f = (k: keyof GrantType) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Field.Label
          fontSize="11px"
          fontFamily="mono"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="gray.500"
        >
          Name
        </Field.Label>
        <Input
          value={form.name || ''}
          onChange={(e) => f('name')(e.target.value)}
          placeholder="e.g., github"
          disabled={!!initial}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label
          fontSize="11px"
          fontFamily="mono"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="gray.500"
        >
          Grant Code
        </Field.Label>
        <Textarea
          value={form.grantCode || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            f('grantCode')(e.target.value)
          }
          placeholder="async function grant(secrets, account, realm) { ... }"
          rows={5}
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid',
            borderColor: 'inherit',
          }}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label
          fontSize="11px"
          fontFamily="mono"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="gray.500"
        >
          Revoke Code
        </Field.Label>
        <Textarea
          value={form.revokeCode || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            f('revokeCode')(e.target.value)
          }
          placeholder="async function revoke(secrets, account, token) { ... }"
          rows={5}
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid',
            borderColor: 'inherit',
          }}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label
          fontSize="11px"
          fontFamily="mono"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="gray.500"
        >
          Status Code
        </Field.Label>
        <Textarea
          value={form.getStatusCode || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            f('getStatusCode')(e.target.value)
          }
          placeholder="async function getStatus(secrets, account, token) { ... }"
          rows={5}
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid',
            borderColor: 'inherit',
          }}
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

interface GrantTypesPanelProps {
  types: GrantType[];
  onAdd: (data: Partial<GrantType>) => void;
  onEdit: (data: GrantType) => void;
  onDelete: (name: string) => void;
}

export const GrantTypesPanel = ({
  types,
  onAdd,
  onEdit,
  onDelete,
}: GrantTypesPanelProps) => {
  const { open, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState<GrantType | null>(null);
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const hdr = useColorModeValue('gray.50', 'surface.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const hoverBg = useColorModeValue('gray.50', 'surface.700');

  const handleOpen = (t: GrantType | null = null) => {
    setEditing(t);
    onOpen();
  };

  return (
    <VStack gap={4} align="stretch">
      <HStack justify="space-between">
        <Heading
          size="md"
          fontFamily="mono"
          letterSpacing="0.06em"
          color={textColor}
        >
          Grant API Types
        </Heading>
        <Button
          size="sm"
          colorPalette="brand"
          onClick={() => handleOpen()}
          fontFamily="mono"
        >
          + New Type
        </Button>
      </HStack>
      <Box
        bg={bg}
        border="1px solid"
        borderColor={border}
        borderRadius="10px"
        overflow="hidden"
      >
        <Table.Root size="sm">
          <Table.Header bg={hdr}>
            <Table.Row>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Name
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Grant Code
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Revoke Code
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Status Code
              </Table.ColumnHeader>
              <Table.ColumnHeader></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {types.map((t) => (
              <Table.Row
                key={t.id || t.name}
                _hover={{ bg: hoverBg }}
                transition="background 0.1s"
              >
                <Table.Cell>
                  <RouterLink to={`/grantapis/${t.name}`}>
                    <Text
                      fontSize="12px"
                      fontFamily="mono"
                      fontWeight="600"
                      color="brand.500"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {t.name}
                    </Text>
                  </RouterLink>
                </Table.Cell>
                <Table.Cell>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="gray.400"
                    truncate
                    maxWidth="120px"
                  >
                    {t.grantCode?.substring(0, 30)}...
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="gray.400"
                    truncate
                    maxWidth="120px"
                  >
                    {t.revokeCode?.substring(0, 30)}...
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="gray.400"
                    truncate
                    maxWidth="120px"
                  >
                    {t.getStatusCode?.substring(0, 30)}...
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1} justify="flex-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleOpen(t)}
                      fontFamily="mono"
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => onDelete(t.name)}
                      aria-label="delete"
                    >
                      <Text>✕</Text>
                    </IconButton>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root
        open={open}
        onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
        size="xl"
      >
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content bg={bg} border="1px solid" borderColor={border}>
            <Dialog.Header
              fontFamily="mono"
              fontSize="sm"
              letterSpacing="0.08em"
            >
              {editing ? 'Edit Grant API Type' : 'Add Grant API Type'}
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <GrantTypeForm
                initial={editing}
                onSave={(f) => {
                  if (editing) {
                    onEdit({ ...editing, ...f } as GrantType);
                  } else {
                    onAdd(f);
                  }
                  onClose();
                }}
                onCancel={onClose}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  );
};
