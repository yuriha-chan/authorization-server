/** @format */

import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChakraProvider, Box, Flex, VStack, Text, Spinner, Center } from '@chakra-ui/react';
import { useDisclosure } from '@chakra-ui/react';
import { ThemeProvider } from 'next-themes';

import { system } from './theme';
import { useColorMode } from './hooks/useColorMode';
import { api } from './api';
import { toaster, Toaster } from './components/ui/toaster';
import {
  Sidebar,
  OverviewPanel,
  PendingPanel,
  AgentsPanel,
  AuthorizationsPanel,
  GrantsPanel,
  GrantTypesPanel,
  NotificationsPanel,
  AuthsDrawer,
  EventLog,
} from './components';
import {
  ContainerDetail,
  AuthorizationDetail,
  GrantDetail,
  GrantTypeDetail,
} from './pages';
import type {
  Agent,
  Grant,
  GrantType,
  NotificationAPI,
  PendingRequest,
  Authorization,
  Status,
  Overview,
  EventLog as EventLogType,
  NavId,
  WebSocketMessage,
} from './types';
import { useColorModeValue } from './hooks/useColorMode';

function Dashboard() {
  const [nav, setNav] = useState<NavId>('overview');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [grantTypes, setGrantTypes] = useState<GrantType[]>([]);
  const [notifs, setNotifs] = useState<NotificationAPI[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLogType[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { open: isAuthsOpen, onOpen: onAuthsOpen, onClose: onAuthsClose } = useDisclosure();
  const { toggleColorMode } = useColorMode();

  const loadData = useCallback(async () => {
    try {
      const [
        agentsData,
        grantsData,
        grantTypesData,
        notifsData,
        pendingData,
        statusData,
        logsData,
        overviewData,
        authsData,
      ] = await Promise.all([
        api.getAgents().catch(() => [] as Agent[]),
        api.getGrants().catch(() => [] as Grant[]),
        api.getGrantTypes().catch(() => [] as GrantType[]),
        api.getNotifications().catch(() => [] as NotificationAPI[]),
        api.getPendingRequests().catch(() => [] as PendingRequest[]),
        api.getStatus().catch(() => ({} as Status)),
        api.getEventLogs().catch(() => [] as EventLogType[]),
        api.getOverview().catch(() => null),
        api.getAuthorizations().catch(() => [] as Authorization[]),
      ]);
      setAgents(agentsData);
      setGrants(grantsData);
      setGrantTypes(grantTypesData);
      setAuthorizations(authsData);
      setNotifs(notifsData);
      setPending(pendingData);
      setStatus(statusData);
      setOverview(overviewData);
      setEventLogs(logsData);
      setProcessedIds(new Set(logsData.map((l) => l.id)));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      ws = new WebSocket(
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/admin/ws`
      );

      ws.onopen = () => {
        loadData();
        heartbeatInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.data?.id && processedIds.has(msg.data.id)) {
          return;
        }
        const now = new Date().toISOString();
        if (msg.data?.id) {
          setProcessedIds((prev) => new Set([...prev, msg.data.id!]));
        }

        switch (msg.type) {
          case 'new_pending_request':
            setPending((prev) => [
              ...prev,
              {
                id: msg.data.requestId!,
                state: 'pending',
                createdAt: new Date(msg.data.timestamp || Date.now()).toISOString(),
                authorization: {
                  type: msg.data.type || '',
                  realm: msg.data.realm || { repository: '', baseUrl: '' },
                  container: {
                    id: msg.data.containerId || '',
                    uniqueName: msg.data.agentUniqueName || '',
                    fingerprint: msg.data.fingerprint || '',
                  },
                },
              },
            ]);
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: '',
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'request_approved':
            setPending((prev) => prev.filter((p) => p.id !== msg.data.requestId));
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: '',
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'request_denied':
            setPending((prev) => prev.filter((p) => p.id !== msg.data.requestId));
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: '',
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'agent_registered':
            setAgents((prev) => [
              ...prev,
              {
                id: msg.data.agentId || '',
                uniqueName: msg.data.uniqueName || '',
                fingerprint: msg.data.fingerprint || '',
                state: 'active',
              },
            ]);
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: `Agent "${msg.data.uniqueName}" registered`,
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'agent_updated':
            if (msg.data.action === 'create' || msg.data.action === 'update') {
              setAgents((prev) => {
                const exists = prev.find((a) => a.id === msg.data.agent?.id);
                if (exists) {
                  return prev.map((a) =>
                    a.id === msg.data.agent?.id ? msg.data.agent! : a
                  );
                }
                return [...prev, msg.data.agent!];
              });
            } else if (msg.data.action === 'delete') {
              setAgents((prev) =>
                prev.filter((a) => a.id !== msg.data.agent?.id)
              );
            }
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: '',
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'grant_api_updated':
            if (msg.data.action === 'create' || msg.data.action === 'update') {
              setGrants((prev) => {
                const exists = prev.find((g) => g.id === msg.data.grantApi?.id);
                if (exists) {
                  return prev.map((g) =>
                    g.id === msg.data.grantApi?.id ? msg.data.grantApi! : g
                  );
                }
                return [...prev, msg.data.grantApi!];
              });
            } else if (msg.data.action === 'delete') {
              setGrants((prev) =>
                prev.filter((g) => g.id !== msg.data.grantApi?.id)
              );
            }
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: `Grant API ${msg.data.action}: ${msg.data.grantApi?.name}`,
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'notification_api_updated':
            if (msg.data.action === 'create' || msg.data.action === 'update') {
              setNotifs((prev) => {
                const exists = prev.find(
                  (n) => n.id === msg.data.notificationApi?.id
                );
                if (exists) {
                  return prev.map((n) =>
                    n.id === msg.data.notificationApi?.id
                      ? msg.data.notificationApi!
                      : n
                  );
                }
                return [...prev, msg.data.notificationApi!];
              });
            } else if (msg.data.action === 'delete') {
              setNotifs((prev) =>
                prev.filter((n) => n.id !== msg.data.notificationApi?.id)
              );
            }
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: '',
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'authorization_revoked':
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: '',
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
          case 'notification_delivery_failed':
            setEventLogs((prev) =>
              [
                {
                  id: msg.data.id || '',
                  timestamp: now,
                  type: msg.type,
                  message: '',
                  data: msg.data,
                },
                ...prev,
              ].slice(0, 100)
            );
            break;
        }
      };

      ws.onerror = () => console.error('WebSocket error');
      ws.onclose = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      ws?.close();
    };
  }, [loadData, processedIds]);

  const bg = useColorModeValue('gray.100', 'surface.900');
  const mainBg = useColorModeValue('gray.50', 'surface.900');

  const notify = useCallback(
    (title: string, desc: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
      toaster.create({
        title,
        description: desc,
        type,
        duration: 3000,
      });
    },
    []
  );

  const handleApprove = async (id: string, revokeTime: string) => {
    try {
      await api.approveRequest(id, revokeTime);
      setPending((p) => p.filter((r) => r.id !== id));
      notify('Approved', `Request approved with TTL ${revokeTime}s`, 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await api.denyRequest(id);
      setPending((p) => p.filter((r) => r.id !== id));
      notify('Denied', 'Request denied', 'warning');
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await api.deleteAgent(id);
      setAgents((a) => a.filter((x) => x.id !== id));
      notify('Deleted', 'Agent removed', 'info');
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleViewAuths = (a: Agent) => {
    setSelectedAgent(a);
    onAuthsOpen();
  };

  const handleRevokeAuth = async (authId: string) => {
    try {
      await api.updateAuthorization(authId, { state: 'revoked' });
      notify('Revoked', 'Authorization revoked', 'info');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleUpdateRevokeTime = async (authId: string, revokeTime: string) => {
    try {
      await api.updateAuthorization(authId, { revokeTime });
      notify('Updated', 'Revoke time updated', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleApproveAuth = async (authId: string, revokeTime?: string) => {
    try {
      await api.approveAuthRequest(authId, revokeTime);
      notify('Approved', 'Authorization request approved', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleDenyAuth = async (authId: string) => {
    try {
      await api.denyAuthRequest(authId);
      notify('Denied', 'Authorization request denied', 'info');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleDeleteGrant = async (id: string) => {
    try {
      await api.deleteGrant(id);
      setGrants((g) => g.filter((x) => x.id !== id));
      notify('Deleted', 'Grant API removed', 'info');
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleDeleteGrantType = async (name: string) => {
    try {
      await api.deleteGrantType(name);
      setGrantTypes((t) => t.filter((x) => x.name !== name));
      notify('Deleted', 'Grant API type removed', 'info');
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleAddGrantType = async (f: Partial<GrantType>) => {
    try {
      await api.createGrantType(f);
      notify('Added', 'Grant API type created', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleEditGrantType = async (f: GrantType) => {
    try {
      await api.updateGrantType(f.name, f);
      notify('Updated', 'Grant API type updated', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleAddGrant = async (f: Partial<Grant>) => {
    try {
      await api.createGrant(f);
      notify('Added', 'Grant API created', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleEditGrant = async (f: Grant) => {
    try {
      await api.updateGrant(f.id, f);
      notify('Updated', 'Grant API updated', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifs((n) => n.filter((x) => x.id !== id));
      notify('Deleted', 'Notification API removed', 'info');
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleAddNotif = async (f: Partial<NotificationAPI>) => {
    try {
      await api.createNotification(f);
      notify('Added', 'Notification API created', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleEditNotif = async (f: NotificationAPI) => {
    try {
      await api.updateNotification(f.id, f);
      notify('Updated', 'Notification API updated', 'success');
      loadData();
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const handleToggleNotif = async (id: string) => {
    const notif = notifs.find((n) => n.id === id);
    if (!notif) return;
    try {
      await api.updateNotification(id, {
        ...notif,
        state: notif.state === 'active' ? 'paused' : 'active',
      });
      setNotifs((n) =>
        n.map((x) =>
          x.id === id
            ? { ...x, state: x.state === 'active' ? 'paused' : 'active' }
            : x
        )
      );
      notify('Updated', `Notification ${notif.state === 'active' ? 'paused' : 'activated'}`, 'success');
    } catch (err) {
      notify('Error', (err as Error).message, 'error');
    }
  };

  const panels: Record<NavId, React.ReactNode> = {
    overview: (
      <OverviewPanel
        status={status || { version: 'Loading...', agents: 0, pendingRequests: 0, activeAuthorizations: 0, uptime: '...' }}
        pending={pending}
        agents={agents}
        overview={overview}
        onNav={(id: string) => setNav(id as NavId)}
      />
    ),
    requests: (
      <PendingPanel
        requests={pending}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    ),
    agents: (
      <AgentsPanel
        agents={agents}
        onDelete={handleDeleteAgent}
        onViewAuths={handleViewAuths}
      />
    ),
    authorizations: <AuthorizationsPanel authorizations={authorizations} />,
    grants: (
      <GrantsPanel
        grants={grants}
        grantTypes={grantTypes}
        onAdd={handleAddGrant}
        onEdit={handleEditGrant}
        onDelete={handleDeleteGrant}
      />
    ),
    'grant-types': (
      <GrantTypesPanel
        types={grantTypes}
        onAdd={handleAddGrantType}
        onEdit={handleEditGrantType}
        onDelete={handleDeleteGrantType}
      />
    ),
    notifications: (
      <NotificationsPanel
        notifs={notifs}
        onAdd={handleAddNotif}
        onEdit={handleEditNotif}
        onDelete={handleDeleteNotif}
        onToggle={handleToggleNotif}
      />
    ),
  };

  if (loading) {
    return (
      <Center height="100vh" bg={mainBg}>
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text fontFamily="mono" color="gray.500">
            Loading...
          </Text>
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
        <Sidebar
          active={nav}
          onNav={setNav}
          pendingCount={pending.length}
          onToggleColor={toggleColorMode}
        />

        <Box flex={1} overflowY="auto" p={8} bg={bg}>
          <Box maxW="1000px" mx="auto">
            {panels[nav]}
            {nav === 'overview' && (
              <Box mt={8}>
                <EventLog events={eventLogs} />
              </Box>
            )}
          </Box>
        </Box>
      </Flex>

      <AuthsDrawer
        agent={selectedAgent}
        open={isAuthsOpen}
        onClose={onAuthsClose}
        onRevoke={handleRevokeAuth}
        onApprove={handleApproveAuth}
        onDeny={handleDenyAuth}
        onUpdateRevokeTime={handleUpdateRevokeTime}
      />
      <Toaster />
    </Box>
  );
}

function AppInner() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/container/:id" element={<ContainerDetail />} />
        <Route path="/authorization/:id" element={<AuthorizationDetail />} />
        <Route path="/grant/:id" element={<GrantDetail />} />
        <Route path="/grantapis/:type" element={<GrantTypeDetail />} />
      </Routes>
    </BrowserRouter>
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
