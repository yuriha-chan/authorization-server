/** @format */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Button, IconButton, Heading, Table, Dialog } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useDisclosure } from '@chakra-ui/react';

import { GrantForm } from './GrantForm';
import { useColorModeValue } from '../hooks/useColorMode';
import type { Grant, GrantType } from '../types';

interface GrantsPanelProps {
  grants: Grant[];
  grantTypes: GrantType[];
  onAdd: (data: Partial<Grant>) => void;
  onEdit: (data: Grant) => void;
  onDelete: (id: string) => void;
}

export const GrantsPanel = ({
  grants,
  grantTypes,
  onAdd,
  onEdit,
  onDelete,
}: GrantsPanelProps) => {
  const { open, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState<Grant | null>(null);
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const hdr = useColorModeValue('gray.50', 'surface.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const hoverBg = useColorModeValue('gray.50', 'surface.700');

  const handleOpen = (g: Grant | null = null) => {
    setEditing(g);
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
          Grant APIs
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
                Type
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Base URL
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Account
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                TTL (s)
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Auths
              </Table.ColumnHeader>
              <Table.ColumnHeader></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {grants.map((g) => (
              <Table.Row
                key={g.id}
                _hover={{ bg: hoverBg }}
                transition="background 0.1s"
              >
                <Table.Cell>
                  <RouterLink to={`/grant/${g.id}`}>
                    <Text
                      fontSize="12px"
                      fontFamily="mono"
                      fontWeight="600"
                      color="brand.500"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {g.name}
                    </Text>
                  </RouterLink>
                </Table.Cell>
                <Table.Cell>
                  <RouterLink to={`/grantapis/${typeof g.type === 'object' ? g.type?.name : g.type}`}>
                    <Badge
                      colorPalette="blue"
                      fontFamily="mono"
                      fontSize="9px"
                      _hover={{ cursor: 'pointer' }}
                    >
                      {typeof g.type === 'object' ? g.type?.name : g.type}
                    </Badge>
                  </RouterLink>
                </Table.Cell>
                <Table.Cell>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="gray.400"
                    truncate
                    maxWidth="180px"
                  >
                    {g.baseURL}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="12px" fontFamily="mono">
                    {g.account}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="12px" fontFamily="mono" color="brand.400">
                    {g.defaultRevokeTime}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="12px" fontFamily="mono">
                    {g.authorizations}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1} justify="flex-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleOpen(g)}
                      fontFamily="mono"
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => onDelete(g.id)}
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
              {editing ? 'Edit Grant API' : 'Add Grant API'}
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <GrantForm
                initial={editing}
                grantTypes={grantTypes}
                onSave={(f) => {
                  if (editing) {
                    onEdit({ ...editing, ...f } as Grant);
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
