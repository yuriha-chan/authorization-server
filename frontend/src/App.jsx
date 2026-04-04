import { useState, useEffect } from "react";
import { ChakraProvider, createSystem, defaultConfig, Box, Flex, VStack, HStack, Text, Badge, Button, IconButton, Input, useDisclosure, Table, Heading, Grid, Spinner, Center } from "@chakra-ui/react";
import { Dialog } from "@chakra-ui/react";
import { Drawer } from "@chakra-ui/react";
import { Tabs } from "@chakra-ui/react";
import { Field } from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react";
import { Toast } from "@chakra-ui/react";
import { Avatar } from "@chakra-ui/react";
import { ThemeProvider, useTheme } from "next-themes";
import { api } from "./api";
import { Toaster, toaster } from "./components/ui/toaster";

const useColorModeValue = (light, dark) => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? dark : light;
};

const useColorMode = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const toggleColorMode = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");
  return { colorMode: resolvedTheme, toggleColorMode, setColorMode: setTheme };
};

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'JetBrains Mono', 'Fira Code', monospace" },
        body: { value: "'IBM Plex Sans', 'Inter', sans-serif" },
        mono: { value: "'JetBrains Mono', monospace" },
      },
      colors: {
        brand: {
          50: { value: "#e0fff8" }, 100: { value: "#b3ffe9" }, 200: { value: "#80ffd6" }, 300: { value: "#4dffc4" },
          400: { value: "#1affa8" }, 500: { value: "#00e890" }, 600: { value: "#00b870" }, 700: { value: "#008850" },
          800: { value: "#005830" }, 900: { value: "#002810" },
        },
        accent: {
          50: { value: "#e6f0ff" }, 100: { value: "#b3d0ff" }, 200: { value: "#80afff" }, 300: { value: "#4d8fff" },
          400: { value: "#1a6fff" }, 500: { value: "#0055e8" }, 600: { value: "#0043b8" }, 700: { value: "#003188" },
          800: { value: "#001f58" }, 900: { value: "#000d28" },
        },
        danger: {
          400: { value: "#ff4d6d" }, 500: { value: "#e8003d" }, 600: { value: "#b80031" },
        },
        warn: {
          400: { value: "#ffce45" }, 500: { value: "#e8a800" }, 600: { value: "#b88300" },
        },
        surface: {
          900: { value: "#080c12" }, 800: { value: "#0d1320" }, 700: { value: "#121a2e" }, 600: { value: "#182238" },
          500: { value: "#1e2d4a" }, 400: { value: "#253757" }, 300: { value: "#2e4470" },
        },
      },
    },
    semanticTokens: {
      colors: {
        "chakra-body-bg": {
          value: { base: "#f7fafc", _dark: "#080c12" },
        },
        "chakra-body-text": {
          value: { base: "#1a202c", _dark: "#e2e8f0" },
        },
      },
    },
  },
});

const mockStatus = { uptime: "14d 3h 22m", version: "1.4.2", agents: 3, pendingRequests: 2, activeAuthorizations: 11 };

const timeAgo = (ts) => {
  const d = (Date.now() - new Date(ts)) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
};

const expiryLabel = (ms) => {
  const d = ms - Date.now();
  if (d < 0) return "Expired";
  const days = Math.floor(d / 86400000);
  if (days === 0) return "Today";
  return `${days}d`;
};

const stateColor = (s) => {
  if (s === "active") return "green";
  if (s === "expired" || s === "revoked") return "red";
  if (s === "pending") return "yellow";
  return "gray";
};

const Dot = ({ color = "green", pulse = false }) => (
  <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center" width="10px" height="10px">
    {pulse && (
      <Box position="absolute" width="10px" height="10px" borderRadius="full" bg={`${color}.500`} opacity={0.4}
        css={{ animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite", "@keyframes ping": { "0%": { transform: "scale(1)", opacity: 0.4 }, "100%": { transform: "scale(2.5)", opacity: 0 } } }}
      />
    )}
    <Box width="8px" height="8px" borderRadius="full" bg={`${color}.400`} />
  </Box>
);

const FpBadge = ({ fp }) => (
  <Text fontSize="10px" fontFamily="mono" px={2} py={0.5} borderRadius="sm" bg="surface.700" color="gray.300" display="inline-block" truncate maxWidth="180px">
    {fp}
  </Text>
);

const NAV = [
  { id: "overview", label: "Overview", icon: "⬡" },
  { id: "requests", label: "Pending Requests", icon: "◈", badge: true },
  { id: "agents", label: "Agent Containers", icon: "◻" },
  { id: "grants", label: "Grant APIs", icon: "◆" },
  { id: "notifications", label: "Notification APIs", icon: "◇" },
];

const Sidebar = ({ active, onNav, pendingCount, onToggleColor }) => {
  const bg = useColorModeValue("white", "surface.800");
  const borderC = useColorModeValue("gray.200", "surface.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const mutedColor = useColorModeValue("gray.600", "gray.500");
  const activeBg = useColorModeValue("gray.100", "surface.700");
  const hoverBg = useColorModeValue("gray.50", "surface.700");

  return (
    <Box width="220px" flexShrink={0} bg={bg} borderRight="1px solid" borderColor={borderC} display="flex" flexDirection="column" height="100vh" position="sticky" top={0}>
      <Box p={5} borderBottom="1px solid" borderColor={borderC}>
        <HStack gap={2}>
          <Box width="28px" height="28px" borderRadius="6px" bg="brand.500" display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="14px" fontWeight="bold" color="surface.900" fontFamily="mono">A</Text>
          </Box>
          <VStack gap={0} align="start">
            <Text fontSize="11px" fontWeight="700" fontFamily="mono" color={textColor} letterSpacing="0.08em" lineHeight={1.2}>AUTH</Text>
            <Text fontSize="9px" fontFamily="mono" color={mutedColor} letterSpacing="0.12em" lineHeight={1.2}>SERVER ADMIN</Text>
          </VStack>
        </HStack>
      </Box>

      <VStack gap={0} align="stretch" flex={1} py={3} overflowY="auto">
        {NAV.map((n) => {
          const isActive = active === n.id;
          return (
            <Box key={n.id} as="button" onClick={() => onNav(n.id)}
              px={4} py={3} textAlign="left" position="relative"
              bg={isActive ? activeBg : "transparent"}
              _hover={{ bg: hoverBg }}
              transition="background 0.15s"
              borderLeft="2px solid"
              borderColor={isActive ? "brand.500" : "transparent"}
            >
              <HStack gap={3}>
                <Text fontSize="14px" color={isActive ? "brand.400" : mutedColor} fontFamily="mono">{n.icon}</Text>
                <Text fontSize="12px" fontWeight={isActive ? "700" : "500"} color={isActive ? textColor : mutedColor} fontFamily="mono" letterSpacing="0.04em">
                  {n.label}
                </Text>
                {n.badge && pendingCount > 0 && (
                  <Badge colorPalette="red" borderRadius="full" fontSize="9px" px={1.5} ml="auto">{pendingCount}</Badge>
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
            <Text fontSize="10px" fontFamily="mono" color={mutedColor}>LIVE</Text>
          </HStack>
          <Button size="xs" variant="ghost" onClick={onToggleColor} color={mutedColor}>
            <Text>◑</Text>
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

const StatCard = ({ label, value, sub, accent, icon }) => {
  const bg = useColorModeValue("white", "surface.800");
  const border = useColorModeValue("gray.200", "surface.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  return (
    <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" p={5} position="relative" overflow="hidden">
      <Box position="absolute" top={3} right={3} fontSize="18px" opacity={0.15}>{icon}</Box>
      <Text fontSize="9px" fontFamily="mono" letterSpacing="0.14em" textTransform="uppercase" color="gray.500" mb={2}>{label}</Text>
      <Text fontSize="26px" fontFamily="mono" fontWeight="700" color={accent || "brand.400"} lineHeight={1}>{value}</Text>
      {sub && <Text fontSize="11px" color="gray.500" mt={1} fontFamily="mono">{sub}</Text>}
    </Box>
  );
};

const OverviewPanel = ({ status, pending, agents }) => {
  const textColor = useColorModeValue("gray.800", "gray.100");
  const mutedColor = useColorModeValue("gray.600", "gray.500");
  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" gap={0}>
          <Heading size="md" fontFamily="mono" letterSpacing="0.06em" color={textColor}>System Overview</Heading>
          <Text fontSize="12px" color={mutedColor} fontFamily="mono">Authorization Server {status.version}</Text>
        </VStack>
      </HStack>

      <Grid templateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap={4}>
        <StatCard label="Active Agents" value={status.agents} icon="◻" />
        <StatCard label="Pending Requests" value={status.pendingRequests} accent={status.pendingRequests > 0 ? "warn.400" : "brand.400"} icon="◈" />
        <StatCard label="Authorizations" value={status.activeAuthorizations} icon="◆" />
      </Grid>

      {pending.length > 0 && (
        <Box>
          <Text fontSize="10px" fontFamily="mono" letterSpacing="0.12em" textTransform="uppercase" color="gray.500" mb={3}>Recent Pending Requests</Text>
          <VStack gap={2} align="stretch">
            {pending.slice(0, 3).map((r) => (
              <RequestRow key={r.id} req={r} compact />
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

const RequestRow = ({ req, compact, onApprove, onDeny }) => {
  const [revokeTime, setRevokeTime] = useState("3600");
  const { authorization: auth } = req;
  const bg = useColorModeValue("white", "surface.800");
  const border = useColorModeValue("gray.200", "surface.600");
  const textColor = useColorModeValue("gray.800", "gray.100");

  return (
    <Box bg={bg} border="1px solid" borderColor={border} borderRadius="8px" p={compact ? 3 : 4}
      borderLeft="3px solid" borderColor="warn.400"
      transition="box-shadow 0.15s" _hover={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
    >
      <Flex gap={4} align={compact ? "center" : "start"} flexWrap="wrap">
        <VStack gap={1} align="start" flex={1} minWidth="200px">
          <HStack gap={2} flexWrap="wrap">
            <Badge colorPalette="blue" fontFamily="mono" fontSize="9px">{auth.type.toUpperCase()}</Badge>
            <Text fontSize="12px" fontFamily="mono" fontWeight="600" color={textColor}>
              {auth.realm.repository}
            </Text>
          </HStack>
          <HStack gap={2} flexWrap="wrap">
            <Text fontSize="10px" fontFamily="mono" color="gray.500">{auth.container.uniqueName}</Text>
            {!compact && <FpBadge fp={auth.container.fingerprint} />}
          </HStack>
        </VStack>

        {!compact && (
          <HStack gap={3}>
            <HStack gap={1}>
              {auth.realm.read ? <Badge colorPalette="green" fontSize="9px">READ</Badge> : null}
              {auth.realm.write ? <Badge colorPalette="orange" fontSize="9px">WRITE</Badge> : null}
            </HStack>
            <Text fontSize="10px" fontFamily="mono" color="gray.500">{auth.realm.baseUrl}</Text>
          </HStack>
        )}

        <HStack gap={2} align="center">
          <Text fontSize="10px" fontFamily="mono" color="gray.500">{timeAgo(req.timestamp)}</Text>
          {!compact && (
            <>
              <Input size="xs" width="90px" value={revokeTime} onChange={e => setRevokeTime(e.target.value)} fontFamily="mono" placeholder="TTL (s)" />
              <Button size="xs" colorPalette="brand" onClick={() => onApprove?.(req.id, revokeTime)}>Approve</Button>
              <Button size="xs" colorPalette="red" variant="outline" onClick={() => onDeny?.(req.id)}>Deny</Button>
            </>
          )}
          {compact && <Badge colorPalette="yellow" fontSize="9px">PENDING</Badge>}
        </HStack>
      </Flex>
    </Box>
  );
};

const PendingPanel = ({ requests, onApprove, onDeny }) => {
  const textColor = useColorModeValue("gray.800", "gray.100");
  const mutedColor = useColorModeValue("gray.600", "gray.500");
  return (
    <VStack gap={4} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" gap={0}>
          <Heading size="md" fontFamily="mono" letterSpacing="0.06em" color={textColor}>Pending Requests</Heading>
          <Text fontSize="12px" color={mutedColor} fontFamily="mono">{requests.length} awaiting approval</Text>
        </VStack>
        {requests.length > 0 && <Dot color="yellow" pulse />}
      </HStack>
      {requests.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="32px" mb={3}>◈</Text>
          <Text fontFamily="mono" fontSize="13px" color={mutedColor}>No pending requests</Text>
        </Box>
      ) : (
        <VStack gap={3} align="stretch">
          {requests.map((r) => (
            <RequestRow key={r.id} req={r} onApprove={onApprove} onDeny={onDeny} />
          ))}
        </VStack>
      )}
    </VStack>
  );
};

const AgentsPanel = ({ agents, onDelete, onViewAuths }) => {
  const bg = useColorModeValue("white", "surface.800");
  const border = useColorModeValue("gray.200", "surface.600");
  const hdr = useColorModeValue("gray.50", "surface.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const hoverBg = useColorModeValue("gray.50", "surface.700");

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.ceil(agents.length / pageSize);
  const pagedAgents = agents.slice((page - 1) * pageSize, page * pageSize);

  return (
    <VStack gap={4} align="stretch">
      <Heading size="md" fontFamily="mono" letterSpacing="0.06em" color={textColor}>Agent Containers</Heading>
      <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" overflow="hidden">
        <Table.Root size="sm">
          <Table.Header bg={hdr}>
            <Table.Row>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Agent</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Fingerprint</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Expiry</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Auths</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>State</Table.ColumnHeader>
              <Table.ColumnHeader></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pagedAgents.map((a) => (
              <Table.Row key={a.id} _hover={{ bg: hoverBg }} transition="background 0.1s">
                <Table.Cell>
                  <Text fontSize="12px" fontFamily="mono" fontWeight="600">{a.uniqueName}</Text>
                </Table.Cell>
                <Table.Cell><FpBadge fp={a.fingerprint} /></Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={a.state === "expired" ? "red" : expiryLabel(a.expiryDate) === "Today" ? "orange" : "gray"} fontFamily="mono" fontSize="10px">
                    {expiryLabel(a.expiryDate)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="12px" fontFamily="mono" color="brand.400">{a.authorizations?.length}</Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    <Dot color={stateColor(a.state)} pulse={a.state === "active"} />
                    <Text fontSize="11px" fontFamily="mono" color="gray.400">{a.state}</Text>
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1} justify="flex-end">
                    <Button size="xs" variant="outline" colorPalette="brand" onClick={() => onViewAuths(a)} fontFamily="mono">Auths</Button>
                    <IconButton size="xs" variant="ghost" colorPalette="red" onClick={() => onDelete(a.id)} aria-label="delete">
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
          <Button size="xs" variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} fontFamily="mono">Prev</Button>
          <Text fontSize="11px" fontFamily="mono" color="gray.400">{page} / {totalPages}</Text>
          <Button size="xs" variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} fontFamily="mono">Next</Button>
        </HStack>
      )}
    </VStack>
  );
};

const GrantForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial || { name: "", type: "github", baseURL: "", account: "", secret: "", defaultRevokeTime: 3600 });
  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">Name</Field.Label>
        <Input value={form.name} onChange={e => f("name")(e.target.value)} placeholder="GitHub Primary" />
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">Type</Field.Label>
        <Input value={form.type} readOnly fontFamily="mono" color="gray.400" />
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">Base URL</Field.Label>
        <Input value={form.baseURL} onChange={e => f("baseURL")(e.target.value)} placeholder="https://api.github.com" />
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">Account</Field.Label>
        <Input value={form.account} onChange={e => f("account")(e.target.value)} placeholder="org-main" />
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">Secret Token</Field.Label>
        <Input type="password" value={form.secret} onChange={e => f("secret")(e.target.value)} placeholder="ghp_•••••••••••••••" />
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">Default Revoke Time (s)</Field.Label>
        <Input type="number" value={form.defaultRevokeTime} onChange={e => f("defaultRevokeTime")(+e.target.value)} />
      </Field.Root>
      <HStack justify="flex-end" gap={2} pt={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} fontFamily="mono">Cancel</Button>
        <Button size="sm" colorPalette="brand" onClick={() => onSave(form)} fontFamily="mono">Save</Button>
      </HStack>
    </VStack>
  );
};

const GrantsPanel = ({ grants, onAdd, onEdit, onDelete }) => {
  const { open, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState(null);
  const bg = useColorModeValue("white", "surface.800");
  const border = useColorModeValue("gray.200", "surface.600");
  const hdr = useColorModeValue("gray.50", "surface.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const hoverBg = useColorModeValue("gray.50", "surface.700");

  const handleOpen = (g = null) => { setEditing(g); onOpen(); };

  return (
    <VStack gap={4} align="stretch">
      <HStack justify="space-between">
        <Heading size="md" fontFamily="mono" letterSpacing="0.06em" color={textColor}>Grant APIs</Heading>
        <Button size="sm" colorPalette="brand" onClick={() => handleOpen()} fontFamily="mono">+ New</Button>
      </HStack>
      <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" overflow="hidden">
        <Table.Root size="sm">
          <Table.Header bg={hdr}>
            <Table.Row>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Name</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Type</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Base URL</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Account</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>TTL (s)</Table.ColumnHeader>
              <Table.ColumnHeader fontFamily="mono" fontSize="10px" letterSpacing="0.12em" textTransform="uppercase" color="gray.400" py={3}>Auths</Table.ColumnHeader>
              <Table.ColumnHeader></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {grants.map((g) => (
              <Table.Row key={g.id} _hover={{ bg: hoverBg }} transition="background 0.1s">
                <Table.Cell><Text fontSize="12px" fontFamily="mono" fontWeight="600">{g.name}</Text></Table.Cell>
                <Table.Cell><Badge colorPalette="blue" fontFamily="mono" fontSize="9px">{g.type}</Badge></Table.Cell>
                <Table.Cell><Text fontSize="11px" fontFamily="mono" color="gray.400" truncate maxWidth="180px">{g.baseURL}</Text></Table.Cell>
                <Table.Cell><Text fontSize="12px" fontFamily="mono">{g.account}</Text></Table.Cell>
                <Table.Cell><Text fontSize="12px" fontFamily="mono" color="brand.400">{g.defaultRevokeTime}</Text></Table.Cell>
                <Table.Cell><Text fontSize="12px" fontFamily="mono">{g.authorizations}</Text></Table.Cell>
                <Table.Cell>
                  <HStack gap={1} justify="flex-end">
                    <Button size="xs" variant="ghost" onClick={() => handleOpen(g)} fontFamily="mono">Edit</Button>
                    <IconButton size="xs" variant="ghost" colorPalette="red" onClick={() => onDelete(g.id)} aria-label="delete">
                      <Text>✕</Text>
                    </IconButton>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content bg={bg} border="1px solid" borderColor={border}>
            <Dialog.Header fontFamily="mono" fontSize="sm" letterSpacing="0.08em">
              {editing ? "Edit Grant API" : "Add Grant API"}
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <GrantForm initial={editing} onSave={(f) => { editing ? onEdit({ ...editing, ...f }) : onAdd(f); onClose(); }} onCancel={onClose} />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  );
};

const NotifForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial || { name: "", type: "discord", baseURL: "", account: "", secret: "", channel: "" });
  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <VStack gap={4} align="stretch">
      {["name", "baseURL", "account", "channel"].map((k) => (
        <Field.Root key={k}>
          <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">{k}</Field.Label>
          <Input value={form[k]} onChange={e => f(k)(e.target.value)} placeholder={k === "channel" ? "#alerts" : ""} />
        </Field.Root>
      ))}
      <Field.Root>
        <Field.Label fontSize="11px" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">Secret</Field.Label>
        <Input type="password" value={form.secret} onChange={e => f("secret")(e.target.value)} />
      </Field.Root>
      <HStack justify="flex-end" gap={2} pt={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} fontFamily="mono">Cancel</Button>
        <Button size="sm" colorPalette="brand" onClick={() => onSave(form)} fontFamily="mono">Save</Button>
      </HStack>
    </VStack>
  );
};

const NotificationsPanel = ({ notifs, onAdd, onEdit, onDelete, onToggle }) => {
  const { open, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState(null);
  const bg = useColorModeValue("white", "surface.800");
  const border = useColorModeValue("gray.200", "surface.600");
  const textColor = useColorModeValue("gray.800", "gray.100");

  const handleOpen = (n = null) => { setEditing(n); onOpen(); };

  return (
    <VStack gap={4} align="stretch">
      <HStack justify="space-between">
        <Heading size="md" fontFamily="mono" letterSpacing="0.06em" color={textColor}>Notification APIs</Heading>
        <Button size="sm" colorPalette="brand" onClick={() => handleOpen()} fontFamily="mono">+ New</Button>
      </HStack>
      <VStack gap={3} align="stretch">
        {notifs.map((n) => (
          <Box key={n.id} bg={bg} border="1px solid" borderColor={border} borderRadius="10px" p={4}>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <VStack align="start" gap={1}>
                <HStack gap={2}>
                  <Badge colorPalette="purple" fontFamily="mono" fontSize="9px">{n.type}</Badge>
                  <Text fontSize="13px" fontFamily="mono" fontWeight="700">{n.name}</Text>
                  <Dot color={n.state === "active" ? "green" : "red"} pulse={n.state === "active"} />
                </HStack>
                <HStack gap={3} flexWrap="wrap">
                  <Text fontSize="11px" fontFamily="mono" color="gray.500">{n.baseURL}</Text>
                  <Text fontSize="11px" fontFamily="mono" color="gray.400">@{n.account}</Text>
                  <Badge colorPalette="gray" fontFamily="mono" fontSize="9px">{n.channel}</Badge>
                </HStack>
              </VStack>
              <HStack gap={2}>
                <Button size="xs" variant="outline" colorPalette={n.state === "active" ? "green" : "gray"} onClick={() => onToggle(n.id)} fontFamily="mono">
                  {n.state === "active" ? "Active" : "Paused"}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => handleOpen(n)} fontFamily="mono">Edit</Button>
                <IconButton size="xs" variant="ghost" colorPalette="red" onClick={() => onDelete(n.id)} aria-label="delete">
                  <Text>✕</Text>
                </IconButton>
              </HStack>
            </Flex>
          </Box>
        ))}
      </VStack>

      <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content bg={bg} border="1px solid" borderColor={border}>
            <Dialog.Header fontFamily="mono" fontSize="sm" letterSpacing="0.08em">
              {editing ? "Edit Notification API" : "Add Notification API"}
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <NotifForm initial={editing} onSave={(f) => { editing ? onEdit({ ...editing, ...f }) : onAdd(f); onClose(); }} onCancel={onClose} />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  );
};

const AuthsDrawer = ({ agent, open, onClose, onRevoke, onApprove, onDeny, onUpdateRevokeTime }) => {
  const auths = agent?.authorizations || [];
  const bg = useColorModeValue("white", "surface.800");
  const border = useColorModeValue("gray.200", "surface.600");
  const [revokeTimes, setRevokeTimes] = useState({});

  const handleSave = (authId) => {
    onUpdateRevokeTime(authId, revokeTimes[authId]);
  };

  const handleRevoke = (authId) => {
    onRevoke(authId);
  };

  const handleApprove = (authId) => {
    onApprove(authId, revokeTimes[authId]);
  };

  const handleDeny = (authId) => {
    onDeny(authId);
  };

  return (
    <Drawer.Root open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
      <Drawer.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <Drawer.Positioner>
        <Drawer.Content bg={bg}>
          <Drawer.CloseTrigger />
          <Drawer.Header fontFamily="mono" fontSize="sm" borderBottom="1px solid" borderColor={border}>
            <VStack align="start" gap={0}>
              <Text letterSpacing="0.08em">Granted Authorizations</Text>
              <Text fontSize="10px" color="gray.500" fontWeight="normal">{agent?.uniqueName}</Text>
            </VStack>
          </Drawer.Header>
          <Drawer.Body pt={4}>
            {auths.length === 0 ? (
              <Text fontSize="12px" fontFamily="mono" color="gray.500">No authorizations</Text>
            ) : (
              <VStack gap={3} align="stretch">
                {auths.map((a) => (
                  <Box key={a.id} border="1px solid" borderColor={border} borderRadius="8px" p={3}
                    borderLeft="3px solid" borderColor={a.state === "active" ? "brand.500" : "red.500"}
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack gap={2}>
                        <Badge colorPalette="blue" fontSize="9px" fontFamily="mono">{a.type}</Badge>
                        <Text fontSize="12px" fontFamily="mono" fontWeight="600">{a.realm?.repository}</Text>
                      </HStack>
                      <HStack gap={1}>
                        <Dot color={a.state === "active" ? "green" : "red"} />
                        <Text fontSize="10px" fontFamily="mono" color="gray.400">{a.state}</Text>
                      </HStack>
                    </Flex>
                    <HStack gap={2} mb={2}>
                      {a.realm?.read ? <Badge colorPalette="green" fontSize="9px">READ</Badge> : null}
                      {a.realm?.write ? <Badge colorPalette="orange" fontSize="9px">WRITE</Badge> : null}
                      <Text fontSize="10px" fontFamily="mono" color="gray.500">{a.realm?.baseUrl}</Text>
                    </HStack>
                    {a.state === "active" && (
                      <HStack gap={2} mt={2}>
                        <Input size="xs" placeholder="Revoke time" value={revokeTimes[a.id] ?? a.revokeTime ?? ''} onChange={(e) => setRevokeTimes((p) => ({ ...p, [a.id]: e.target.value }))} fontFamily="mono" />
                        <Button size="xs" colorPalette="brand" onClick={() => handleSave(a.id)} fontFamily="mono">Save</Button>
                        <Button size="xs" colorPalette="red" variant="outline" onClick={() => handleRevoke(a.id)} fontFamily="mono">Revoke</Button>
                      </HStack>
                    )}
                    {a.state === "pending" && (
                      <HStack gap={2} mt={2}>
                        <Button size="xs" colorPalette="green" onClick={() => handleApprove(a.id)} fontFamily="mono">Approve</Button>
                        <Button size="xs" colorPalette="red" variant="outline" onClick={() => handleDeny(a.id)} fontFamily="mono">Deny</Button>
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

const mockEvents = [
  { id: 1, ts: new Date(Date.now() - 10000).toISOString(), type: "request", msg: "New auth request from reasoning-agent-7f2a for org/core-infra" },
  { id: 2, ts: new Date(Date.now() - 60000).toISOString(), type: "approved", msg: "Authorization approved: code-executor-3d1b → org/ml-models (READ)" },
  { id: 3, ts: new Date(Date.now() - 180000).toISOString(), type: "revoked", msg: "Authorization revoked: data-analyst-9c4e → org/analytics" },
  { id: 4, ts: new Date(Date.now() - 600000).toISOString(), type: "register", msg: "Agent registered: data-analyst-9c4e" },
];

const EventLog = ({ events = [] }) => {
  const evColors = { 
    new_pending_request: "warn", request_approved: "brand", request_denied: "danger", 
    agent_updated: "accent", grant_api_updated: "brand", notification_api_updated: "accent", 
    authorization_revoked: "danger", notification_delivery_failed: "error" 
  };
  const bg = useColorModeValue("gray.50", "surface.900");
  const border = useColorModeValue("gray.200", "surface.600");
  const textColor = useColorModeValue("gray.700", "gray.300");

  const displayEvents = events.length > 0 ? events : mockEvents;

  return (
    <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" p={4} maxHeight="280px" overflowY="auto">
      <Text fontSize="9px" fontFamily="mono" letterSpacing="0.14em" textTransform="uppercase" color="gray.500" mb={3}>Event Log · Live</Text>
      <VStack gap={2} align="stretch">
        {displayEvents.map((e) => {
          const c = evColors[e.type] || "gray";
          const ts = e.timestamp || e.ts;
          const msg = e.message || e.msg;
          return (
            <HStack key={e.id} gap={3} align="start">
              <Text fontSize="9px" fontFamily="mono" color="gray.500" flexShrink={0} pt={0.5}>{timeAgo(ts)}</Text>
              <Box width="6px" height="6px" borderRadius="full" bg={`${c === "brand" ? "brand" : c === "danger" ? "red" : c === "warn" ? "yellow" : c === "error" ? "red" : "blue"}.400`} mt={1.5} flexShrink={0} />
              <Text fontSize="11px" fontFamily="mono" color={textColor} lineHeight={1.5}>{msg}</Text>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
};

function AppInner() {
  const [nav, setNav] = useState("overview");
  const [agents, setAgents] = useState([]);
  const [grants, setGrants] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [pending, setPending] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [processedIds, setProcessedIds] = useState(new Set());
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { open: isAuthsOpen, onOpen: onAuthsOpen, onClose: onAuthsClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();

  const loadData = async () => {
    try {
      const [agentsData, grantsData, notifsData, pendingData, statusData, logsData] = await Promise.all([
        api.getAgents().catch(() => []),
        api.getGrants().catch(() => []),
        api.getNotifications().catch(() => []),
        api.getPendingRequests().catch(() => []),
        api.getStatus().catch(() => ({})),
        api.getEventLogs().catch(() => []),
      ]);
      setAgents(agentsData);
      setGrants(grantsData);
      setNotifs(notifsData);
      setPending(pendingData);
      setStatus(statusData);
      setEventLogs(logsData);
      setProcessedIds(new Set(logsData.map(l => l.id)));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ws;
    let heartbeatInterval;
    const connect = () => {
      ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/admin/ws`);
      ws.onopen = () => {
        loadData();
        heartbeatInterval = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'ping' })), 5000);
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.data?.id && processedIds.has(msg.data.id)) {
          return;
        }
        const now = new Date().toISOString();
        setProcessedIds(prev => msg.data?.id ? new Set([...prev, msg.data.id]) : prev);
        switch (msg.type) {
          case 'new_pending_request':
            setPending(prev => [...prev, {
              id: msg.data.requestId,
              agentUniqueName: msg.data.agentUniqueName,
              fingerprint: msg.data.fingerprint,
              realm: msg.data.realm,
              state: 'pending',
              createdAt: msg.data.timestamp
            }]);
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `New auth request from ${msg.data.agentUniqueName} for ${msg.data.realm}`
            }, ...prev].slice(0, 100));
            break;
          case 'request_approved':
            setPending(prev => prev.filter(r => r.id !== msg.data.requestId));
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `Authorization approved: ${msg.data.requestId}`
            }, ...prev].slice(0, 100));
            break;
          case 'request_denied':
            setPending(prev => prev.filter(r => r.id !== msg.data.requestId));
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `Authorization denied: ${msg.data.requestId}`
            }, ...prev].slice(0, 100));
            break;
          case 'agent_updated':
            if (msg.data.action === 'create' || msg.data.action === 'update') {
              setAgents(prev => {
                const exists = prev.find(a => a.id === msg.data.agent.id);
                if (exists) {
                  return prev.map(a => a.id === msg.data.agent.id ? msg.data.agent : a);
                }
                return [...prev, msg.data.agent];
              });
            } else if (msg.data.action === 'delete') {
              setAgents(prev => prev.filter(a => a.id !== msg.data.agent.id));
            }
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `Agent ${msg.data.action}: ${msg.data.agent?.uniqueName}`
            }, ...prev].slice(0, 100));
            break;
          case 'grant_api_updated':
            if (msg.data.action === 'create' || msg.data.action === 'update') {
              setGrants(prev => {
                const exists = prev.find(g => g.id === msg.data.grantApi.id);
                if (exists) {
                  return prev.map(g => g.id === msg.data.grantApi.id ? msg.data.grantApi : g);
                }
                return [...prev, msg.data.grantApi];
              });
            } else if (msg.data.action === 'delete') {
              setGrants(prev => prev.filter(g => g.id !== msg.data.grantApi.id));
            }
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `Grant API ${msg.data.action}: ${msg.data.grantApi?.name}`
            }, ...prev].slice(0, 100));
            break;
          case 'notification_api_updated':
            if (msg.data.action === 'create' || msg.data.action === 'update') {
              setNotifs(prev => {
                const exists = prev.find(n => n.id === msg.data.notificationApi.id);
                if (exists) {
                  return prev.map(n => n.id === msg.data.notificationApi.id ? msg.data.notificationApi : n);
                }
                return [...prev, msg.data.notificationApi];
              });
            } else if (msg.data.action === 'delete') {
              setNotifs(prev => prev.filter(n => n.id !== msg.data.notificationApi.id));
            }
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `Notification API ${msg.data.action}: ${msg.data.notificationApi?.name}`
            }, ...prev].slice(0, 100));
            break;
          case 'authorization_revoked':
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `Authorization revoked: ${msg.data.containerUniqueName}`
            }, ...prev].slice(0, 100));
            break;
          case 'notification_delivery_failed':
            setEventLogs(prev => [{
              id: msg.data.id,
              timestamp: now,
              type: msg.type,
              message: `Notification delivery failed: ${msg.data.channel}`
            }, ...prev].slice(0, 100));
            break;
        }
      };
      ws.onerror = () => console.error('WebSocket error');
      ws.onclose = () => {
        clearInterval(heartbeatInterval);
        setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      clearInterval(heartbeatInterval);
      ws?.close();
    };
  }, []);

  const bg = useColorModeValue("gray.100", "surface.900");
  const mainBg = useColorModeValue("gray.50", "surface.900");

  const notify = (title, desc, type = "success") => toaster.create({ title, description: desc, type, duration: 3000, placement: "top-end" });

  const handleApprove = async (id, revokeTime) => {
    try {
      await api.approveRequest(id, revokeTime);
      setPending((p) => p.filter((r) => r.id !== id));
      notify("Approved", `Request approved with TTL ${revokeTime}s`, "success");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleDeny = async (id) => {
    try {
      await api.denyRequest(id);
      setPending((p) => p.filter((r) => r.id !== id));
      notify("Denied", `Request denied`, "warning");
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleDeleteAgent = async (id) => {
    try {
      await api.deleteAgent(id);
      setAgents((a) => a.filter((x) => x.id !== id));
      notify("Deleted", "Agent removed", "info");
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleViewAuths = (a) => { setSelectedAgent(a); onAuthsOpen(); };
  const handleRevokeAuth = async (authId) => {
    try {
      await api.updateAuthorization(authId, { state: 'revoked' });
      notify("Revoked", "Authorization revoked", "info");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleUpdateRevokeTime = async (authId, revokeTime) => {
    try {
      await api.updateAuthorization(authId, { revokeTime });
      notify("Updated", "Revoke time updated", "success");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleApproveAuth = async (authId, revokeTime) => {
    try {
      await api.approveAuthRequest(authId, revokeTime);
      notify("Approved", "Authorization request approved", "success");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleDenyAuth = async (authId) => {
    try {
      await api.denyAuthRequest(authId);
      notify("Denied", "Authorization request denied", "info");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleDeleteGrant = async (id) => {
    try {
      await api.deleteGrant(id);
      setGrants((g) => g.filter((x) => x.id !== id));
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleAddGrant = async (f) => {
    try {
      await api.createGrant(f);
      notify("Added", "Grant API created", "success");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleEditGrant = async (f) => {
    try {
      await api.updateGrant(f.id, f);
      notify("Updated", "Grant API updated", "success");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleDeleteNotif = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifs((n) => n.filter((x) => x.id !== id));
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleAddNotif = async (f) => {
    try {
      await api.createNotification(f);
      notify("Added", "Notification API created", "success");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleEditNotif = async (f) => {
    try {
      await api.updateNotification(f.id, f);
      notify("Updated", "Notification API updated", "success");
      loadData();
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };
  const handleToggleNotif = async (id) => {
    const notif = notifs.find(n => n.id === id);
    if (!notif) return;
    try {
      await api.updateNotification(id, { ...notif, state: notif.state === "active" ? "paused" : "active" });
      setNotifs((n) => n.map((x) => x.id === id ? { ...x, state: x.state === "active" ? "paused" : "active" } : x));
    } catch (err) {
      notify("Error", err.message, "error");
    }
  };

  const panels = {
    overview: <OverviewPanel status={status || { version: "Loading...", agents: 0, pendingRequests: 0, activeAuthorizations: 0, uptime: "..." }} pending={pending} agents={agents} />,
    requests: <PendingPanel requests={pending} onApprove={handleApprove} onDeny={handleDeny} />,
    agents: <AgentsPanel agents={agents} onDelete={handleDeleteAgent} onViewAuths={handleViewAuths} />,
    grants: <GrantsPanel grants={grants} onAdd={handleAddGrant} onEdit={handleEditGrant} onDelete={handleDeleteGrant} />,
    notifications: <NotificationsPanel notifs={notifs} onAdd={handleAddNotif} onEdit={handleEditNotif} onDelete={handleDeleteNotif} onToggle={handleToggleNotif} />,
  };

  if (loading) {
    return (
      <Center height="100vh" bg={mainBg}>
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text fontFamily="mono" color="gray.500">Loading...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box minHeight="100vh" bg={mainBg}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
      `}</style>
      <Flex height="100vh" overflow="hidden">
        <Sidebar active={nav} onNav={setNav} pendingCount={pending.length} onToggleColor={toggleColorMode} />

        <Box flex={1} overflowY="auto" p={8} bg={bg}>
          <Box maxW="1000px" mx="auto">
            {panels[nav]}
            {nav === "overview" && (
              <Box mt={8}>
                <EventLog events={eventLogs} />
              </Box>
            )}
          </Box>
        </Box>
      </Flex>

      <AuthsDrawer agent={selectedAgent} open={isAuthsOpen} onClose={onAuthsClose} onRevoke={handleRevokeAuth} onApprove={handleApproveAuth} onDeny={handleDenyAuth} onUpdateRevokeTime={handleUpdateRevokeTime} />
      <Toaster toaster={toaster} />
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ChakraProvider value={system}>
        <AppInner />
      </ChakraProvider>
    </ThemeProvider>
  );
}
