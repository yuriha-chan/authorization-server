/** @format */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Heading,
  Grid,
  Spinner,
  Center,
  Badge,
} from '@chakra-ui/react';
import { api } from '../api';
import { useColorModeValue } from '../hooks/useColorMode';
import { useCommonStyles, cardStyles } from '../styles';
import { StateBadge, TypeBadge, FpBadge, ContainerWithFingerprint } from '../components';
import type { Authorization } from '../types';

export function AuthorizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [auth, setAuth] = useState<Authorization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useCommonStyles(useColorModeValue);

  useEffect(() => {
    loadAuthorization();
  }, [id]);

  const loadAuthorization = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getAuthorization(id);
      setAuth(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!id || !confirm('Are you sure you want to revoke this authorization?'))
      return;
    try {
      await api.updateAuthorization(id, { state: 'revoked' });
      loadAuthorization();
    } catch (err) {
      alert('Failed to revoke authorization: ' + (err as Error).message);
    }
  };

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error || !auth) {
    return (
      <Center h="50vh">
        <VStack gap={4}>
          <Text color="red.500">Failed to load authorization: {error}</Text>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Dashboard
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack gap={6} align="stretch">
        <HStack justify="space-between">
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <Link to="/">
                <Text
                  fontSize="sm"
                  color={styles.textMuted}
                  _hover={{ color: 'brand.500' }}
                >
                  ← Back to Dashboard
                </Text>
              </Link>
            </HStack>
            <Heading size="lg" fontFamily="mono">
              Authorization Detail
            </Heading>
          </VStack>
          <HStack gap={2}>
            <StateBadge state={auth.state} />
            {auth.state === 'active' && (
              <Button
                colorScheme="red"
                variant="outline"
                size="sm"
                onClick={handleRevoke}
              >
                Revoke
              </Button>
            )}
          </HStack>
        </HStack>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
          <Box bg={styles.bg} {...cardStyles} borderColor={styles.border}>
            <Text
              fontSize="sm"
              fontWeight="bold"
              mb={3}
              color={styles.textMuted}
            >
              Authorization Information
            </Text>
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  ID
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {auth.id}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Key
                </Text>
                <FpBadge fp={auth.key} />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Type
                </Text>
                <TypeBadge type={typeof auth.grantApi?.type === 'object' ? auth.grantApi?.type?.name || '' : auth.grantApi?.type || ''} />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  State
                </Text>
                <StateBadge state={auth.state} />
              </HStack>
              {auth.revokeTime && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color={styles.textMuted}>
                    Revoke Time
                  </Text>
                  <Text fontSize="sm">
                    {new Date(auth.revokeTime).toLocaleString()}
                  </Text>
                </HStack>
              )}
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Created
                </Text>
                <Text fontSize="sm">
                  {auth.createdAt
                    ? new Date(auth.createdAt).toLocaleString()
                    : '-'}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Updated
                </Text>
                <Text fontSize="sm">
                  {auth.updatedAt
                    ? new Date(auth.updatedAt).toLocaleString()
                    : '-'}
                </Text>
              </HStack>
            </VStack>
          </Box>

          <Box bg={styles.bg} {...cardStyles} borderColor={styles.border}>
            <Text
              fontSize="sm"
              fontWeight="bold"
              mb={3}
              color={styles.textMuted}
            >
              Container
            </Text>
            {auth.container ? (
              <Box
                p={3}
                border="1px solid"
                borderColor={styles.border}
                borderRadius="md"
                _hover={{ borderColor: 'brand.500', bg: styles.hover }}
                transition="all 0.2s"
              >
                <VStack align="start" gap={1}>
                  <ContainerWithFingerprint
                    container={auth.container}
                    useColorModeValue={useColorModeValue}
                  />
                  <Text fontSize="xs" color={styles.textMuted}>
                    Created:{' '}
                    {auth.container.createdAt
                      ? new Date(auth.container.createdAt).toLocaleString()
                      : '-'}
                  </Text>
                </VStack>
              </Box>
            ) : (
              <Text color={styles.textMuted} fontSize="sm">
                No container information available.
              </Text>
            )}
          </Box>
        </Grid>

        <Box bg={styles.bg} {...cardStyles} borderColor={styles.border}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            mb={3}
            color={styles.textMuted}
          >
            Realm Configuration
          </Text>
          {auth.realm ? (
            <Grid
              templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }}
              gap={4}
            >
              <Box>
                <Text fontSize="xs" color={styles.textMuted}>
                  Repository
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {auth.realm.repository}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color={styles.textMuted}>
                  Base URL
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {auth.grantApi?.baseURL}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color={styles.textMuted}>
                  Permissions
                </Text>
                <HStack gap={1}>
                  {auth.realm.read === 1 && (
                    <Badge colorPalette="green" fontSize="9px" fontFamily="mono">
                      READ
                    </Badge>
                  )}
                  {auth.realm.write === 1 && (
                    <Badge colorPalette="orange" fontSize="9px" fontFamily="mono">
                      WRITE
                    </Badge>
                  )}
                  {auth.realm.read !== 1 && auth.realm.write !== 1 && (
                    <Text fontSize="xs" color={styles.textMuted}>
                      None
                    </Text>
                  )}
                </HStack>
              </Box>
            </Grid>
          ) : (
            <Text color={styles.textMuted} fontSize="sm">
              No realm configuration available.
            </Text>
          )}
        </Box>

        <Box bg={styles.bg} {...cardStyles} borderColor={styles.border}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            mb={4}
            color={styles.textMuted}
          >
            Request History ({auth.requests?.length || 0})
          </Text>
          {auth.requests && auth.requests.length > 0 ? (
            <VStack align="stretch" gap={2}>
              {auth.requests.map((request) => (
                <VStack key={request.id} align="stretch" gap={1}>
                  {request.history &&
                    request.history.map((entry, idx) => (
                      <HStack key={idx} gap={3} align="start">
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          color={styles.textMuted}
                          width="140px"
                          flexShrink={0}
                        >
                          {new Date(entry.timestamp).toLocaleString()}
                        </Text>
                        <StateBadge state={entry.action} />
                        {entry.admin && (
                          <Text fontSize="xs" color={styles.textMuted}>
                            by {entry.admin}
                          </Text>
                        )}
                      </HStack>
                    ))}
                </VStack>
              ))}
            </VStack>
          ) : (
            <Text color={styles.textMuted} fontSize="sm">
              No requests found for this authorization.
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
