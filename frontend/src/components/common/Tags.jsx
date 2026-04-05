import { Badge, Text, Box } from "@chakra-ui/react";

export const StateBadge = ({ state, size = "sm" }) => {
  const colorPalette = {
    active: "green",
    pending: "yellow",
    approved: "green",
    denied: "red",
    revoked: "red",
    expired: "red",
    deleted: "gray"
  }[state] || "gray";

  return (
    <Badge colorPalette={colorPalette} fontSize="9px" fontFamily="mono" textTransform="uppercase">
      {state}
    </Badge>
  );
};

export const TypeBadge = ({ type }) => {
  const colorPalette = {
    github: "blue",
    gitlab: "orange",
    discord: "purple",
    slack: "green"
  }[type.toLowerCase()] || "gray";

  return (
    <Badge colorPalette={colorPalette} fontSize="9px" fontFamily="mono" textTransform="uppercase">
      {type}
    </Badge>
  );
};

export const PermissionBadge = ({ read, write }) => (
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

export const FpBadge = ({ fp }) => (
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

export const Dot = ({ color = "green", pulse = false }) => (
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
          animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
          "@keyframes ping": {
            "0%": { transform: "scale(1)", opacity: 0.4 },
            "100%": { transform: "scale(2.5)", opacity: 0 }
          }
        }}
      />
    )}
    <Box width="8px" height="8px" borderRadius="full" bg={`${color}.400`} />
  </Box>
);

export const EventTypeBadge = ({ type }) => {
  const colors = {
    new_pending_request: "yellow",
    request_approved: "green",
    request_denied: "red",
    agent_updated: "blue",
    grant_api_updated: "purple",
    notification_api_updated: "cyan",
    authorization_revoked: "red",
    notification_delivery_failed: "red"
  };

  return (
    <Box
      width="6px"
      height="6px"
      borderRadius="full"
      bg={`${colors[type] || "gray"}.400`}
      flexShrink={0}
    />
  );
};

export const expiryLabel = (ms) => {
  if (!ms) return "Never";
  const d = ms - Date.now();
  if (d < 0) return "Expired";
  const days = Math.floor(d / 86400000);
  if (days === 0) return "Today";
  return `${days}d`;
};

export const stateColor = (s) => {
  if (s === "active" || s === "approved") return "green";
  if (s === "expired" || s === "revoked" || s === "denied") return "red";
  if (s === "pending") return "yellow";
  return "gray";
};

export const formatDuration = (ms) => {
  if (!ms) return "Never";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} days`;
  return `${hours} hours`;
};
