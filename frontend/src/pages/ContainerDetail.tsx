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
import { useCommonStyles, cardStyles, linkStyles } from '../styles';
import {
  StateBadge,
  TypeBadge,
} from '../components';
import type { Agent } from '../types';

export function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [container, setContainer] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useCommonStyles(useColorModeValue);

  useEffect(() => {
    loadContainer();
  }, [id]);

  const loadContainer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getAgent(id);
      setContainer(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!id || !confirm('Are you sure you want to revoke this container?')) return;
    try {
      await api.deleteAgent(id);
      loadContainer();
    } catch (err) {
      alert('Failed to revoke container: ' + (err as Error).message);
    }
  };

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error || !container) {
    return (
      <Center h="50vh">
        <VStack gap={4}>
          <Text color="red.500">Failed to load container: {error}</Text>
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
              Container: {container.uniqueName}
            </Heading>
          </VStack>
          <HStack gap={2}>
            {container.state === 'active' ? (
              <Button
                colorScheme="red"
                variant="outline"
                onClick={handleRevoke}
                size="sm"
              >
                Revoke Container
              </Button>
            ) : (
              <StateBadge state="revoked" />
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
              Basic Information
            </Text>
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  ID
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {container.id}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Unique Name
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {container.uniqueName}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Fingerprint
                </Text>
                <Text
                  fontSize="10px"
                  fontFamily="mono"
                  px={2}
                  py={0.5}
                  borderRadius="sm"
                  bg="surface.700"
                  color="gray.300"
                  display="inline-block"
                  wordBreak="break-all"
                >
                  {container.fingerprint}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  State
                </Text>
                <StateBadge state={container.state} />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Created
                </Text>
                <Text fontSize="sm">
                  {container.createdAt
                    ? new Date(container.createdAt).toLocaleString()
                    : '-'}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Updated
                </Text>
                <Text fontSize="sm">
                  {container.updatedAt
                    ? new Date(container.updatedAt).toLocaleString()
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
              Public Key
            </Text>
            <Box
              as="pre"
              bg={styles.code}
              p={3}
              borderRadius="md"
              fontFamily="mono"
              fontSize="xs"
              wordBreak="break-all"
              whiteSpace="pre-wrap"
              textAlign="left"
              maxH="200px"
              overflowY="auto"
            >
              {container.publicKey}
            </Box>
          </Box>
        </Grid>

        <Box bg={styles.bg} {...cardStyles} borderColor={styles.border}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            mb={4}
            color={styles.textMuted}
          >
            Authorizations ({container.authorizations?.length || 0})
          </Text>
          {container.authorizations && container.authorizations.length > 0 ? (
            <VStack align="stretch" gap={3}>
              {container.authorizations.map((auth) => (
                <Link key={auth.id} to={`/authorization/${auth.id}`}>
                  <Box
                    p={3}
                    border="1px solid"
                    borderColor={styles.border}
                    borderRadius="md"
                    _hover={{ borderColor: 'brand.500', bg: styles.hover }}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between">
                      <VStack align="start" gap={1}>
                        <HStack gap={2}>
                          <TypeBadge type={auth.type} />
                          <Text
                            fontSize="sm"
                            fontFamily="mono"
                            fontWeight="medium"
                            style={{ ...linkStyles }}
                          >
                            {auth.realm?.repository || 'Unknown Repository'}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color={styles.textMuted}>
                          Created:{' '}
                          {auth.createdAt
                            ? new Date(auth.createdAt).toLocaleDateString()
                            : '-'}
                        </Text>
                      </VStack>
                      <HStack gap={2}>
                        <StateBadge state={auth.state} />
                        {auth.realm?.read === 1 && (
                          <Badge colorPalette="green" fontSize="9px" fontFamily="mono">
                            READ
                          </Badge>
                        )}
                        {auth.realm?.write === 1 && (
                          <Badge colorPalette="orange" fontSize="9px" fontFamily="mono">
                            WRITE
                          </Badge>
                        )}
                      </HStack>
                    </HStack>
                  </Box>
                </Link>
              ))}
            </VStack>
          ) : (
            <Text color={styles.textMuted} fontSize="sm">
              No authorizations found for this container.
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
