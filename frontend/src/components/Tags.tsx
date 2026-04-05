/** @format */

import { Badge, Text, Box } from '@chakra-ui/react';

interface StateBadgeProps {
  state?: string;
  size?: string;
}

export const StateBadge = ({ state, size = 'sm' }: StateBadgeProps) => {
  const colorPalette: Record<string, string> = {
    active: 'green',
    pending: 'yellow',
    approved: 'green',
    denied: 'red',
    revoked: 'red',
    expired: 'red',
    deleted: 'gray',
  };

  return (
    <Badge
      colorPalette={colorPalette[state || ''] || 'gray'}
      fontSize="9px"
      fontFamily="mono"
      textTransform="uppercase"
      size={size as 'sm' | 'md' | 'lg' | 'xs'}
    >
      {state}
    </Badge>
  );
};

interface TypeBadgeProps {
  type: string;
}

export const TypeBadge = ({ type }: TypeBadgeProps) => {
  const colorPalette: Record<string, string> = {
    github: 'blue',
    gitlab: 'orange',
    discord: 'purple',
    slack: 'green',
  };

  return (
    <Badge
      colorPalette={colorPalette[type.toLowerCase()] || 'gray'}
      fontSize="9px"
      fontFamily="mono"
      textTransform="uppercase"
    >
      {type}
    </Badge>
  );
};

interface PermissionBadgeProps {
  read?: boolean | number;
  write?: boolean | number;
}

export const PermissionBadge = ({ read, write }: PermissionBadgeProps) => (
  <>
    {read && (
      <Badge colorPalette="green" fontSize="9px" fontFamily="mono">
        READ
      </Badge>
    )}
    {write && (
      <Badge colorPalette="orange" fontSize="9px" fontFamily="mono">
        WRITE
      </Badge>
    )}
  </>
);

interface FpBadgeProps {
  fp?: string;
}

export const FpBadge = ({ fp }: FpBadgeProps) => (
  <Text
    fontSize="10px"
    fontFamily="mono"
    px={2}
    py={0.5}
    borderRadius="sm"
    bg="surface.700"
    color="gray.300"
    display="inline-block"
    truncate
    maxWidth="180px"
  >
    {fp}
  </Text>
);

interface DotProps {
  color?: string;
  pulse?: boolean;
}

export const Dot = ({ color = 'green', pulse = false }: DotProps) => (
  <Box
    position="relative"
    display="inline-flex"
    alignItems="center"
    justifyContent="center"
    width="10px"
    height="10px"
  >
    {pulse && (
      <Box
        position="absolute"
        width="10px"
        height="10px"
        borderRadius="full"
        bg={`${color}.500`}
        opacity={0.4}
        css={{
          animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
          '@keyframes ping': {
            '0%': { transform: 'scale(1)', opacity: 0.4 },
            '100%': { transform: 'scale(2.5)', opacity: 0 },
          },
        }}
      />
    )}
    <Box width="8px" height="8px" borderRadius="full" bg={`${color}.400`} />
  </Box>
);

interface EventTypeBadgeProps {
  type: string;
}

export const EventTypeBadge = ({ type }: EventTypeBadgeProps) => {
  const colors: Record<string, string> = {
    new_pending_request: 'yellow',
    request_approved: 'green',
    request_denied: 'red',
    agent_updated: 'blue',
    grant_api_updated: 'purple',
    notification_api_updated: 'cyan',
    authorization_revoked: 'red',
    notification_delivery_failed: 'red',
  };

  return (
    <Box
      width="6px"
      height="6px"
      borderRadius="full"
      bg={`${colors[type] || 'gray'}.400`}
      flexShrink={0}
    />
  );
};
