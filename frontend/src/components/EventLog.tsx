/** @format */

import { Box, VStack, HStack, Text, Badge } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { ContainerWithFingerprint } from '.';
import { useColorModeValue } from '../hooks/useColorMode';
import type { EventLog as EventLogType, EventData } from '../types';
import { timeAgo } from '../utils/time';

interface LogItemProps {
  event: EventLogType;
}

const LogItem = ({ event }: LogItemProps) => {
  const evColors: Record<string, string> = {
    new_pending_request: 'warn',
    request_approved: 'brand',
    request_denied: 'danger',
    agent_registered: 'success',
    agent_updated: 'accent',
    grant_api_updated: 'brand',
    notification_api_updated: 'accent',
    authorization_revoked: 'danger',
    notification_delivery_failed: 'error',
  };
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const mutedColor = useColorModeValue('gray.500', 'gray.500');
  const c = evColors[event.type] || 'gray';
  const ts = event.timestamp;
  const d = event.data || ({} as EventData);

  const renderStructuredContent = () => {
    switch (event.type) {
      case 'new_pending_request':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                New
              </Text>
              {d.requestId && (
                <RouterLink to={`/authorization/${d.requestId}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    auth
                  </Text>
                </RouterLink>
              )}
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                request
              </Text>
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                for
              </Text>
              {d.realm?.repository && (
                <Badge colorPalette="blue" fontSize="9px" fontFamily="mono">
                  {d.realm.repository}
                </Badge>
              )}
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                to
              </Text>
              {d.agentUniqueName && d.containerId && (
                <RouterLink to={`/container/${d.containerId}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {d.agentUniqueName}
                  </Text>
                </RouterLink>
              )}
              {d.agentUniqueName && !d.containerId && (
                <Text fontSize="11px" fontFamily="mono" color={textColor}>
                  {d.agentUniqueName}
                </Text>
              )}
            </HStack>
          </VStack>
        );
      case 'request_approved':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorPalette="green" fontSize="9px" fontFamily="mono">
                APPROVED
              </Badge>
              {d.authorizationId && (
                <RouterLink to={`/authorization/${d.authorizationId}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    authorization
                  </Text>
                </RouterLink>
              )}
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                for
              </Text>
              {d.realm?.repository && (
                <Badge colorPalette="blue" fontSize="9px" fontFamily="mono">
                  {d.realm.repository}
                </Badge>
              )}
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                to
              </Text>
              {d.agentUniqueName && d.containerId && (
                <RouterLink to={`/container/${d.containerId}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {d.agentUniqueName}
                  </Text>
                </RouterLink>
              )}
              {d.agentUniqueName && !d.containerId && (
                <Text fontSize="11px" fontFamily="mono" color={textColor}>
                  {d.agentUniqueName}
                </Text>
              )}
            </HStack>
          </VStack>
        );
      case 'request_denied':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorPalette="red" fontSize="9px" fontFamily="mono">
                DENIED
              </Badge>
              {d.requestId && (
                <RouterLink to={`/authorization/${d.requestId}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    authorization
                  </Text>
                </RouterLink>
              )}
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                for
              </Text>
              {d.realm?.repository && (
                <Badge colorPalette="blue" fontSize="9px" fontFamily="mono">
                  {d.realm.repository}
                </Badge>
              )}
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                to
              </Text>
              {d.agentUniqueName && d.containerId && (
                <RouterLink to={`/container/${d.containerId}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {d.agentUniqueName}
                  </Text>
                </RouterLink>
              )}
              {d.agentUniqueName && !d.containerId && (
                <Text fontSize="11px" fontFamily="mono" color={textColor}>
                  {d.agentUniqueName}
                </Text>
              )}
            </HStack>
          </VStack>
        );
      case 'agent_registered':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorPalette="green" size="sm" fontFamily="mono">
                REGISTERED
              </Badge>
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                agent
              </Text>
              {d.uniqueName && d.agentId && (
                <ContainerWithFingerprint
                  container={{
                    id: d.agentId,
                    uniqueName: d.uniqueName,
                    fingerprint: d.fingerprint || '',
                  }}
                  useColorModeValue={useColorModeValue}
                />
              )}
            </HStack>
          </VStack>
        );
      case 'agent_updated':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorScheme="blue" size="sm" fontFamily="mono">
                AGENT
              </Badge>
              <Badge colorScheme="yellow" size="sm" fontFamily="mono">
                {d.action}
              </Badge>
              {d.agent?.uniqueName && (
                <RouterLink to={`/container/${d.agent.id}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {d.agent.uniqueName}
                  </Text>
                </RouterLink>
              )}
            </HStack>
          </VStack>
        );
      case 'grant_api_updated':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorScheme="purple" size="sm" fontFamily="mono">
                GRANT API
              </Badge>
              <Badge colorScheme="yellow" size="sm" fontFamily="mono">
                {d.action}
              </Badge>
              {d.grantApi?.name && (
                <RouterLink to={`/grant/${d.grantApi.id}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {d.grantApi.name}
                  </Text>
                </RouterLink>
              )}
            </HStack>
          </VStack>
        );
      case 'notification_api_updated':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorScheme="cyan" size="sm" fontFamily="mono">
                NOTIFICATION API
              </Badge>
              <Badge colorScheme="yellow" size="sm" fontFamily="mono">
                {d.action}
              </Badge>
              {d.notificationApi?.name && (
                <Text fontSize="11px" fontFamily="mono" color={textColor}>
                  {d.notificationApi.name}
                </Text>
              )}
            </HStack>
          </VStack>
        );
      case 'authorization_revoked':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorScheme="red" size="sm" fontFamily="mono">
                REVOKED
              </Badge>
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                authorization for
              </Text>
              {d.containerUniqueName && (
                <RouterLink to={`/container/${d.authorizationId}`}>
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {d.containerUniqueName}
                  </Text>
                </RouterLink>
              )}
            </HStack>
          </VStack>
        );
      case 'notification_delivery_failed':
        return (
          <VStack gap={1} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorScheme="red" size="sm" fontFamily="mono">
                FAILED
              </Badge>
              <Text fontSize="11px" fontFamily="mono" color={textColor}>
                notification delivery to
              </Text>
              {d.channel && (
                <Badge colorScheme="gray" size="sm" fontFamily="mono">
                  {d.channel}
                </Badge>
              )}
            </HStack>
          </VStack>
        );
      default:
        return (
          <Text fontSize="11px" fontFamily="mono" color={textColor}>
            {event.message || event.type}
          </Text>
        );
    }
  };

  return (
    <HStack key={event.id} gap={3} align="start">
      <Text
        fontSize="9px"
        fontFamily="mono"
        color={mutedColor}
        flexShrink={0}
        pt={0.5}
        width="60px"
        textAlign="right"
      >
        {timeAgo(ts)}
      </Text>
      <Box
        width="6px"
        height="6px"
        borderRadius="full"
        bg={`${
          c === 'brand'
            ? 'brand'
            : c === 'danger'
              ? 'red'
              : c === 'warn'
                ? 'yellow'
                : c === 'error'
                  ? 'red'
                  : 'blue'
        }.400`}
        mt={1.5}
        flexShrink={0}
      />
      <Box flex={1}>{renderStructuredContent()}</Box>
    </HStack>
  );
};

const mockEvents: EventLogType[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    type: 'new_pending_request',
    data: {
      requestId: '123',
      agentUniqueName: 'test-agent',
      containerId: 'container-1',
      realm: { repository: 'test-repo', baseUrl: 'https://example.com' },
    },
  },
];

interface EventLogComponentProps {
  events?: EventLogType[];
}

export const EventLog = ({ events = [] }: EventLogComponentProps) => {
  const bg = useColorModeValue('gray.50', 'surface.900');
  const border = useColorModeValue('gray.200', 'surface.600');

  const displayEvents = events.length > 0 ? events : mockEvents;

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius="10px"
      p={4}
      maxHeight="280px"
      overflowY="auto"
    >
      <Text
        fontSize="9px"
        fontFamily="mono"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color="gray.500"
        mb={3}
      >
        Event Log · Live
      </Text>
      <VStack gap={2} align="stretch">
        {displayEvents.map((e) => (
          <LogItem key={e.id} event={e} />
        ))}
      </VStack>
    </Box>
  );
};
