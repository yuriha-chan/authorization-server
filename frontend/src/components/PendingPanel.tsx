/** @format */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Input, Button, Flex, Heading } from '@chakra-ui/react';
import { ContainerWithFingerprint } from './ContainerWithFingerprint';
import { useColorModeValue } from '../hooks/useColorMode';
import type { PendingRequest } from '../types';
import { timeAgo } from '../utils/time';
import { Dot } from './Tags';

interface RequestRowProps {
  req: PendingRequest;
  compact?: boolean;
  onApprove?: (id: string, revokeTime: string) => void;
  onDeny?: (id: string) => void;
}

export const RequestRow = ({
  req,
  compact,
  onApprove,
  onDeny,
}: RequestRowProps) => {
  const [revokeTime, setRevokeTime] = useState('3600');
  const { authorization: auth } = req;
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const textColor = useColorModeValue('gray.800', 'gray.100');

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius="8px"
      p={compact ? 3 : 4}
      borderLeft="3px solid"
      borderLeftColor="warn.400"
      transition="box-shadow 0.15s"
      _hover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
    >
      <Flex gap={4} align={compact ? 'center' : 'start'} flexWrap="wrap">
        <VStack gap={1} align="start" flex={1} minWidth="200px">
          <HStack gap={2} flexWrap="wrap">
            <Badge colorPalette="blue" fontFamily="mono" fontSize="9px">
              {typeof auth.grantApi?.type === 'object' ? auth.grantApi?.type?.name : auth.grantApi?.type}
            </Badge>
            <Text fontSize="10px" fontFamily="mono" color="gray.500">
              {auth.grantApi?.baseURL}
            </Text>
          </HStack>
          <HStack gap={2} flexWrap="wrap">
            <Text
              fontSize="12px"
              fontFamily="mono"
              fontWeight="600"
              color={textColor}
            >
              {auth.realm.repository}
            </Text>
            {auth.realm.read === 1 && (
              <Badge colorPalette="green" fontSize="9px">
                READ
              </Badge>
            )}
            {auth.realm.write === 1 && (
              <Badge colorPalette="orange" fontSize="9px">
                WRITE
              </Badge>
            )}
          </HStack>
          <ContainerWithFingerprint
            container={auth.container}
            useColorModeValue={useColorModeValue}
          />
        </VStack>

        <HStack gap={2} align="center">
          <Text fontSize="10px" fontFamily="mono" color="gray.500">
            {timeAgo(req.createdAt)}
          </Text>
          {!compact && (
            <>
              <Input
                size="xs"
                width="90px"
                value={revokeTime}
                onChange={(e) => setRevokeTime(e.target.value)}
                fontFamily="mono"
                placeholder="TTL (s)"
              />
              <Button
                size="xs"
                colorPalette="brand"
                onClick={() => onApprove?.(req.id, revokeTime)}
              >
                Approve
              </Button>
              <Button
                size="xs"
                colorPalette="red"
                variant="outline"
                onClick={() => onDeny?.(req.id)}
              >
                Deny
              </Button>
            </>
          )}
          {compact && (
            <Badge colorPalette="yellow" fontSize="9px">
              PENDING
            </Badge>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

interface PendingPanelProps {
  requests: PendingRequest[];
  onApprove: (id: string, revokeTime: string) => void;
  onDeny: (id: string) => void;
}

export const PendingPanel = ({
  requests,
  onApprove,
  onDeny,
}: PendingPanelProps) => {
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.500');

  return (
    <VStack gap={4} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" gap={0}>
          <Heading
            size="md"
            fontFamily="mono"
            letterSpacing="0.06em"
            color={textColor}
          >
            Pending Requests
          </Heading>
          <Text fontSize="12px" color={mutedColor} fontFamily="mono">
            {requests.length} awaiting approval
          </Text>
        </VStack>
        {requests.length > 0 && <Dot color="yellow" pulse />}
      </HStack>
      {requests.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="32px" mb={3}>
            ◈
          </Text>
          <Text fontFamily="mono" fontSize="13px" color={mutedColor}>
            No pending requests
          </Text>
        </Box>
      ) : (
        <VStack gap={3} align="stretch">
          {requests.map((r) => (
            <RequestRow
              key={r.id}
              req={r}
              onApprove={onApprove}
              onDeny={onDeny}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
};
