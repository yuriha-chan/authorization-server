/** @format */

import { Box, VStack, HStack, Text, Button, Heading, Table, IconButton } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useColorModeValue } from '../hooks/useColorMode';
import type { GrantType } from '../types';

interface GrantTypesPanelProps {
  types: GrantType[];
  onAdd: () => void;
  onDelete: (name: string) => void;
}

export const GrantTypesPanel = ({
  types,
  onAdd,
  onDelete,
}: GrantTypesPanelProps) => {
  const navigate = useNavigate();
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const hdr = useColorModeValue('gray.50', 'surface.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const hoverBg = useColorModeValue('gray.50', 'surface.700');

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
          onClick={onAdd}
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
                      onClick={() => navigate(`/grantapis/${t.name}`)}
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
    </VStack>
  );
};
