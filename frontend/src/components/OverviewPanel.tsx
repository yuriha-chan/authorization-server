/** @format */

import { Box, VStack, HStack, Text, Heading, Grid } from '@chakra-ui/react';
import { useColorModeValue } from '../hooks/useColorMode';
import type { Status, Overview, PendingRequest, Agent } from '../types';
import { RequestRow } from './PendingPanel';

interface OverviewPanelProps {
  status: Status;
  pending: PendingRequest[];
  agents: Agent[];
  overview: Overview | null;
  onNav: (id: string) => void;
}

export const OverviewPanel = ({
  status,
  pending,
  overview,
  onNav,
}: OverviewPanelProps) => {
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.500');
  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" gap={0}>
          <Heading
            size="md"
            fontFamily="mono"
            letterSpacing="0.06em"
            color={textColor}
          >
            System Overview
          </Heading>
          <Text fontSize="12px" color={mutedColor} fontFamily="mono">
            Authorization Server {status.version}
          </Text>
        </VStack>
      </HStack>

      {overview && (
        <Grid templateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap={4}>
          <Box
            bg={bg}
            border="1px solid"
            borderColor={border}
            borderRadius="8px"
            p={3}
            cursor="pointer"
            _hover={{ borderColor: 'brand.400' }}
            onClick={() => onNav('agents')}
          >
            <VStack gap={1} align="start">
              <Text fontSize="10px" color={mutedColor} fontFamily="mono">
                Agents
              </Text>
              <HStack gap={2}>
                <Text
                  fontSize="24px"
                  fontFamily="mono"
                  fontWeight="600"
                  color="brand.400"
                >
                  {overview.agents.active}
                </Text>
                <Text fontSize="12px" color={mutedColor} fontFamily="mono">
                  / {overview.agents.total}
                </Text>
              </HStack>
            </VStack>
          </Box>

          <Box
            bg={bg}
            border="1px solid"
            borderColor={border}
            borderRadius="8px"
            p={3}
            cursor="pointer"
            _hover={{ borderColor: 'warn.400' }}
            onClick={() => onNav('requests')}
          >
            <VStack gap={1} align="start">
              <Text fontSize="10px" color={mutedColor} fontFamily="mono">
                Pending
              </Text>
              <HStack gap={2}>
                <Text
                  fontSize="24px"
                  fontFamily="mono"
                  fontWeight="600"
                  color={pending.length > 0 ? 'warn.400' : 'brand.400'}
                >
                  {pending.length}
                </Text>
                <Text fontSize="12px" color={mutedColor} fontFamily="mono">
                  requests
                </Text>
              </HStack>
            </VStack>
          </Box>

          <Box
            bg={bg}
            border="1px solid"
            borderColor={border}
            borderRadius="8px"
            p={3}
            cursor="pointer"
            _hover={{ borderColor: 'brand.400' }}
            onClick={() => onNav('authorizations')}
          >
            <VStack gap={1} align="start">
              <Text fontSize="10px" color={mutedColor} fontFamily="mono">
                Authorizations
              </Text>
              <HStack gap={2}>
                <Text
                  fontSize="24px"
                  fontFamily="mono"
                  fontWeight="600"
                  color="brand.400"
                >
                  {overview.authorizations.active}
                </Text>
                <Text fontSize="12px" color={mutedColor} fontFamily="mono">
                  / {overview.authorizations.total}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </Grid>
      )}

      {pending.length > 0 && (
        <Box>
          <Text
            fontSize="10px"
            fontFamily="mono"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="gray.500"
            mb={3}
          >
            Recent Pending Requests
          </Text>
          <VStack gap={2} align="stretch">
            {pending.slice(0, 3).map((r) => (
              <Box key={r.id} cursor="pointer" onClick={() => onNav('requests')}>
                <RequestRow req={r} compact />
              </Box>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
};
