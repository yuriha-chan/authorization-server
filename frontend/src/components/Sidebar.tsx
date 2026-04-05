/** @format */

import { Box, VStack, HStack, Text, Badge, Button } from '@chakra-ui/react';
import { Dot } from './Tags';
import { useColorModeValue } from '../hooks/useColorMode';
import type { NavItem, NavId } from '../types';

interface SidebarProps {
  active: NavId;
  onNav: (id: NavId) => void;
  pendingCount: number;
  onToggleColor: () => void;
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: '⬡' },
  { id: 'requests', label: 'Pending Requests', icon: '◈', badge: true },
  { id: 'agents', label: 'Agent Containers', icon: '◻' },
  { id: 'authorizations', label: 'Authorizations', icon: '◉' },
  { id: 'grants', label: 'Grant APIs', icon: '◆' },
  { id: 'grant-types', label: 'Grant API Types', icon: '◈' },
  { id: 'notifications', label: 'Notification APIs', icon: '◇' },
];

export const Sidebar = ({
  active,
  onNav,
  pendingCount,
  onToggleColor,
}: SidebarProps) => {
  const bg = useColorModeValue('white', 'surface.800');
  const borderC = useColorModeValue('gray.200', 'surface.600');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.500');
  const activeBg = useColorModeValue('gray.100', 'surface.700');
  const hoverBg = useColorModeValue('gray.50', 'surface.700');

  return (
    <Box
      width="220px"
      flexShrink={0}
      bg={bg}
      borderRight="1px solid"
      borderColor={borderC}
      display="flex"
      flexDirection="column"
      height="100vh"
      position="sticky"
      top={0}
    >
      <Box p={5} borderBottom="1px solid" borderColor={borderC}>
        <HStack gap={2}>
          <Box
            width="28px"
            height="28px"
            borderRadius="6px"
            bg="brand.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontSize="14px"
              fontWeight="bold"
              color="surface.900"
              fontFamily="mono"
            >
              A
            </Text>
          </Box>
          <VStack gap={0} align="start">
            <Text
              fontSize="11px"
              fontWeight="700"
              fontFamily="mono"
              color={textColor}
              letterSpacing="0.08em"
              lineHeight={1.2}
            >
              AUTH
            </Text>
            <Text
              fontSize="9px"
              fontFamily="mono"
              color={mutedColor}
              letterSpacing="0.12em"
              lineHeight={1.2}
            >
              SERVER ADMIN
            </Text>
          </VStack>
        </HStack>
      </Box>

      <VStack gap={0} align="stretch" flex={1} py={3} overflowY="auto">
        {NAV.map((n) => {
          const isActive = active === n.id;
          return (
            <Box
              key={n.id}
              as="button"
              onClick={() => onNav(n.id)}
              px={4}
              py={3}
              textAlign="left"
              position="relative"
              bg={isActive ? activeBg : 'transparent'}
              _hover={{ bg: hoverBg }}
              transition="background 0.15s"
              borderLeft="2px solid"
              borderColor={isActive ? 'brand.500' : 'transparent'}
            >
              <HStack gap={3}>
                <Text
                  fontSize="14px"
                  color={isActive ? 'brand.400' : mutedColor}
                  fontFamily="mono"
                >
                  {n.icon}
                </Text>
                <Text
                  fontSize="12px"
                  fontWeight={isActive ? '700' : '500'}
                  color={isActive ? textColor : mutedColor}
                  fontFamily="mono"
                  letterSpacing="0.04em"
                >
                  {n.label}
                </Text>
                {n.badge && pendingCount > 0 && (
                  <Badge
                    colorPalette="red"
                    borderRadius="full"
                    fontSize="9px"
                    px={1.5}
                    ml="auto"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </HStack>
            </Box>
          );
        })}
      </VStack>

      <Box p={4} borderTop="1px solid" borderColor={borderC}>
        <HStack gap={2} justify="space-between">
          <HStack gap={2}>
            <Dot color="green" pulse />
            <Text fontSize="10px" fontFamily="mono" color={mutedColor}>
              LIVE
            </Text>
          </HStack>
          <Button
            size="xs"
            variant="ghost"
            onClick={onToggleColor}
            color={mutedColor}
          >
            <Text>◑</Text>
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};
