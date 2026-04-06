/** @format */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Button, Heading, Dialog, Field, Input, IconButton, Flex, NativeSelect } from '@chakra-ui/react';
import { useDisclosure } from '@chakra-ui/react';
import { useColorModeValue } from '../hooks/useColorMode';
import type { NotificationAPI } from '../types';

const notificationTypes = ['discord'] as const;

interface NotifFormProps {
  initial?: Partial<NotificationAPI> | null;
  onSave: (form: Partial<NotificationAPI>) => void;
  onCancel: () => void;
}

const NotifForm = ({ initial, onSave, onCancel }: NotifFormProps) => {
  const [form, setForm] = useState<Partial<NotificationAPI>>(
    initial || {
      name: '',
      type: 'discord',
      baseURL: '',
      account: '',
      secret: '',
      channel: '',
    }
  );
  const f = (k: keyof NotificationAPI) => (v: string) =>
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
          Type
        </Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={form.type || 'discord'}
            onChange={(e) => f('type')(e.target.value)}
          >
            {notificationTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
      {(['name', 'baseURL', 'account', 'channel'] as const).map((k) => (
        <Field.Root key={k}>
          <Field.Label
            fontSize="11px"
            fontFamily="mono"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="gray.500"
          >
            {k}
          </Field.Label>
          <Input
            value={form[k] || ''}
            onChange={(e) => f(k)(e.target.value)}
            placeholder={k === 'channel' ? '#alerts' : ''}
          />
        </Field.Root>
      ))}
      <Field.Root>
        <Field.Label
          fontSize="11px"
          fontFamily="mono"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="gray.500"
        >
          Secret
        </Field.Label>
        <Input
          type="password"
          value={form.secret || ''}
          onChange={(e) => f('secret')(e.target.value)}
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

interface NotificationsPanelProps {
  notifs: NotificationAPI[];
  onAdd: (data: Partial<NotificationAPI>) => void;
  onEdit: (data: NotificationAPI) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const NotificationsPanel = ({
  notifs,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: NotificationsPanelProps) => {
  const { open, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState<NotificationAPI | null>(null);
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const textColor = useColorModeValue('gray.800', 'gray.100');

  const handleOpen = (n: NotificationAPI | null = null) => {
    setEditing(n);
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
          Notification APIs
        </Heading>
        <Button
          size="sm"
          colorPalette="brand"
          onClick={() => handleOpen()}
          fontFamily="mono"
        >
          + New
        </Button>
      </HStack>
      <VStack gap={3} align="stretch">
        {notifs.map((n) => (
          <Box
            key={n.id}
            bg={bg}
            border="1px solid"
            borderColor={border}
            borderRadius="10px"
            p={4}
          >
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <VStack align="start" gap={1}>
                <HStack gap={2}>
                  <Badge colorPalette="purple" fontFamily="mono" fontSize="9px">
                    {n.type}
                  </Badge>
                  <Text fontSize="13px" fontFamily="mono" fontWeight="700">
                    {n.name}
                  </Text>
                  <Dot color={n.state === 'active' ? 'green' : 'red'} pulse={n.state === 'active'} />
                </HStack>
                <HStack gap={3} flexWrap="wrap">
                  <Text fontSize="11px" fontFamily="mono" color="gray.500">
                    {n.baseURL}
                  </Text>
                  <Text fontSize="11px" fontFamily="mono" color="gray.400">
                    @{n.account}
                  </Text>
                  <Badge colorPalette="gray" fontFamily="mono" fontSize="9px">
                    {n.channel}
                  </Badge>
                </HStack>
              </VStack>
              <HStack gap={2}>
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette={n.state === 'active' ? 'green' : 'gray'}
                  onClick={() => onToggle(n.id)}
                  fontFamily="mono"
                >
                  {n.state === 'active' ? 'Active' : 'Paused'}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleOpen(n)}
                  fontFamily="mono"
                >
                  Edit
                </Button>
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => onDelete(n.id)}
                  aria-label="delete"
                >
                  <Text>✕</Text>
                </IconButton>
              </HStack>
            </Flex>
          </Box>
        ))}
      </VStack>

      <Dialog.Root
        open={open}
        onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
        size="md"
      >
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content bg={bg} border="1px solid" borderColor={border}>
            <Dialog.Header
              fontFamily="mono"
              fontSize="sm"
              letterSpacing="0.08em"
            >
              {editing ? 'Edit Notification API' : 'Add Notification API'}
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <NotifForm
                initial={editing}
                onSave={(f) => {
                  if (editing) {
                    onEdit({ ...editing, ...f } as NotificationAPI);
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

import { Dot } from './Tags';
