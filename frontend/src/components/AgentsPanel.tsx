/** @format */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Button, IconButton, Heading, Table } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { Dot, FpBadge } from './Tags';
import { expiryLabel, stateColor } from '../utils/time';
import { useColorModeValue } from '../hooks/useColorMode';
import type { Agent } from '../types';

interface AgentsPanelProps {
  agents: Agent[];
  onDelete: (id: string) => void;
  onViewAuths: (agent: Agent) => void;
}

export const AgentsPanel = ({
  agents,
  onDelete,
  onViewAuths,
}: AgentsPanelProps) => {
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const hdr = useColorModeValue('gray.50', 'surface.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const hoverBg = useColorModeValue('gray.50', 'surface.700');

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.ceil(agents.length / pageSize);
  const pagedAgents = agents.slice((page - 1) * pageSize, page * pageSize);

  return (
    <VStack gap={4} align="stretch">
      <Heading
        size="md"
        fontFamily="mono"
        letterSpacing="0.06em"
        color={textColor}
      >
        Agent Containers
      </Heading>
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
                Agent
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Fingerprint
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Expiry
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
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                State
              </Table.ColumnHeader>
              <Table.ColumnHeader></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pagedAgents.map((a) => (
              <Table.Row
                key={a.id}
                _hover={{ bg: hoverBg }}
                transition="background 0.1s"
              >
                <Table.Cell>
                  <RouterLink to={`/container/${a.id}`}>
                    <Text
                      fontSize="12px"
                      fontFamily="mono"
                      fontWeight="600"
                      color="brand.500"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {a.uniqueName}
                    </Text>
                  </RouterLink>
                </Table.Cell>
                <Table.Cell>
                  <FpBadge fp={a.fingerprint} />
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    colorPalette={
                      a.state === 'expired'
                        ? 'red'
                        : expiryLabel(a.expiryDate) === 'Today'
                          ? 'orange'
                          : 'gray'
                    }
                    fontFamily="mono"
                    fontSize="10px"
                  >
                    {expiryLabel(a.expiryDate)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="12px" fontFamily="mono" color="brand.400">
                    {a.authorizations?.length}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    <Dot color={stateColor(a.state)} pulse={a.state === 'active'} />
                    <Text fontSize="11px" fontFamily="mono" color="gray.400">
                      {a.state}
                    </Text>
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1} justify="flex-end">
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="brand"
                      onClick={() => onViewAuths(a)}
                      fontFamily="mono"
                    >
                      Auths
                    </Button>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => onDelete(a.id)}
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
      {totalPages > 1 && (
        <HStack justify="center" gap={2}>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            fontFamily="mono"
          >
            Prev
          </Button>
          <Text fontSize="11px" fontFamily="mono" color="gray.400">
            {page} / {totalPages}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            fontFamily="mono"
          >
            Next
          </Button>
        </HStack>
      )}
    </VStack>
  );
};
