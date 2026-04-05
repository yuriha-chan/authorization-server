/** @format */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Button, Heading, Table } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { StateBadge } from './Tags';
import { useColorModeValue } from '../hooks/useColorMode';
import type { Authorization } from '../types';

interface AuthorizationsPanelProps {
  authorizations: Authorization[];
}

export const AuthorizationsPanel = ({
  authorizations,
}: AuthorizationsPanelProps) => {
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const hdr = useColorModeValue('gray.50', 'surface.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const hoverBg = useColorModeValue('gray.50', 'surface.700');

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.ceil(authorizations.length / pageSize);
  const pagedAuths = authorizations.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <VStack gap={4} align="stretch">
      <Heading
        size="md"
        fontFamily="mono"
        letterSpacing="0.06em"
        color={textColor}
      >
        Authorizations
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
                Repository
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Container
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Permissions
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
              <Table.ColumnHeader
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="gray.400"
                py={3}
              >
                Created
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pagedAuths.map((auth) => (
              <Table.Row
                key={auth.id}
                _hover={{ bg: hoverBg }}
                transition="background 0.1s"
              >
                <Table.Cell>
                  <Badge
                    colorPalette="blue"
                    fontSize="9px"
                    fontFamily="mono"
                  >
                    {(typeof auth.grantApi?.type === 'object' ? auth.grantApi?.type?.name : auth.grantApi?.type)?.toUpperCase() || '-'}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <RouterLink to={`/authorization/${auth.id}`}>
                    <Text
                      fontSize="12px"
                      fontFamily="mono"
                      fontWeight="600"
                      color="brand.500"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {auth.realm?.repository || 'Unknown'}
                    </Text>
                  </RouterLink>
                </Table.Cell>
                <Table.Cell>
                  {auth.container ? (
                    <RouterLink to={`/container/${auth.container.id}`}>
                      <Text
                        fontSize="11px"
                        fontFamily="mono"
                        color="brand.500"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        {auth.container.uniqueName}
                      </Text>
                    </RouterLink>
                  ) : (
                    <Text fontSize="11px" fontFamily="mono" color="gray.400">
                      -
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    {auth.realm?.read === 1 && (
                      <Badge colorPalette="green" fontSize="9px">
                        READ
                      </Badge>
                    )}
                    {auth.realm?.write === 1 && (
                      <Badge colorPalette="orange" fontSize="9px">
                        WRITE
                      </Badge>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <StateBadge state={auth.state} />
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="11px" fontFamily="mono" color="gray.400">
                    {auth.createdAt
                      ? new Date(auth.createdAt).toLocaleDateString()
                      : '-'}
                  </Text>
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
