/** @format */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Button, Input, Drawer, Flex } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { Dot } from './Tags';
import { useColorModeValue } from '../hooks/useColorMode';
import type { Agent, Authorization } from '../types';

interface AuthsDrawerProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  onRevoke: (authId: string) => void;
  onApprove: (authId: string, revokeTime?: string) => void;
  onDeny: (authId: string) => void;
  onUpdateRevokeTime: (authId: string, revokeTime: string) => void;
}

export const AuthsDrawer = ({
  agent,
  open,
  onClose,
  onRevoke,
  onApprove,
  onDeny,
  onUpdateRevokeTime,
}: AuthsDrawerProps) => {
  const auths = agent?.authorizations || [];
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const [revokeTimes, setRevokeTimes] = useState<Record<string, string>>({});

  const handleSave = (authId: string) => {
    onUpdateRevokeTime(authId, revokeTimes[authId]);
  };

  const handleRevoke = (authId: string) => {
    onRevoke(authId);
  };

  const handleApprove = (authId: string) => {
    onApprove(authId, revokeTimes[authId]);
  };

  const handleDeny = (authId: string) => {
    onDeny(authId);
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
      size="md"
    >
      <Drawer.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <Drawer.Positioner>
        <Drawer.Content bg={bg}>
          <Drawer.CloseTrigger />
          <Drawer.Header
            fontFamily="mono"
            fontSize="sm"
            borderBottom="1px solid"
            borderColor={border}
          >
            <VStack align="start" gap={0}>
              <Text letterSpacing="0.08em">Granted Authorizations</Text>
              <Text fontSize="10px" color="gray.500" fontWeight="normal">
                {agent?.uniqueName}
              </Text>
            </VStack>
          </Drawer.Header>
          <Drawer.Body pt={4}>
            {auths.length === 0 ? (
              <Text fontSize="12px" fontFamily="mono" color="gray.500">
                No authorizations
              </Text>
            ) : (
              <VStack gap={3} align="stretch">
                {auths.map((a: Authorization) => (
                  <Box
                    key={a.id}
                    border="1px solid"
                    borderColor={border}
                    borderRadius="8px"
                    p={3}
                    borderLeft="3px solid"
                    borderLeftColor={
                      a.state === 'active' ? 'brand.500' : 'red.500'
                    }
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack gap={2}>
                        <Badge
                          colorPalette="blue"
                          fontSize="9px"
                          fontFamily="mono"
                        >
                          {a.type}
                        </Badge>
                        <RouterLink to={`/authorization/${a.id}`}>
                          <Text
                            fontSize="12px"
                            fontFamily="mono"
                            fontWeight="600"
                            color="brand.500"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {a.realm?.repository}
                          </Text>
                        </RouterLink>
                      </HStack>
                      <HStack gap={1}>
                        <Dot color={a.state === 'active' ? 'green' : 'red'} />
                        <Text
                          fontSize="10px"
                          fontFamily="mono"
                          color="gray.400"
                        >
                          {a.state}
                        </Text>
                      </HStack>
                    </Flex>
                    <HStack gap={2} mb={2}>
                      {a.realm?.read ? (
                        <Badge colorPalette="green" fontSize="9px">
                          READ
                        </Badge>
                      ) : null}
                      {a.realm?.write ? (
                        <Badge colorPalette="orange" fontSize="9px">
                          WRITE
                        </Badge>
                      ) : null}
                      <Text fontSize="10px" fontFamily="mono" color="gray.500">
                        {a.realm?.baseUrl}
                      </Text>
                    </HStack>
                    {a.state === 'active' && (
                      <HStack gap={2} mt={2}>
                        <Input
                          size="xs"
                          placeholder="Revoke time"
                          value={revokeTimes[a.id] ?? a.revokeTime ?? ''}
                          onChange={(e) =>
                            setRevokeTimes((p) => ({
                              ...p,
                              [a.id]: e.target.value,
                            }))
                          }
                          fontFamily="mono"
                        />
                        <Button
                          size="xs"
                          colorPalette="brand"
                          onClick={() => handleSave(a.id)}
                          fontFamily="mono"
                        >
                          Save
                        </Button>
                        <Button
                          size="xs"
                          colorPalette="red"
                          variant="outline"
                          onClick={() => handleRevoke(a.id)}
                          fontFamily="mono"
                        >
                          Revoke
                        </Button>
                      </HStack>
                    )}
                    {a.state === 'pending' && (
                      <HStack gap={2} mt={2}>
                        <Button
                          size="xs"
                          colorPalette="green"
                          onClick={() => handleApprove(a.id)}
                          fontFamily="mono"
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          colorPalette="red"
                          variant="outline"
                          onClick={() => handleDeny(a.id)}
                          fontFamily="mono"
                        >
                          Deny
                        </Button>
                      </HStack>
                    )}
                  </Box>
                ))}
              </VStack>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
};
