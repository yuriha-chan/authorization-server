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
  Dialog,
} from '@chakra-ui/react';
import { useDisclosure } from '@chakra-ui/react';
import { api } from '../api';
import { useColorModeValue } from '../hooks/useColorMode';
import { useCommonStyles, cardStyles } from '../styles';
import { StateBadge, TypeBadge, GrantForm } from '../components';
import type { Grant } from '../types';

export function GrantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { open, onOpen, onClose } = useDisclosure();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useCommonStyles(useColorModeValue);

  useEffect(() => {
    loadGrant();
  }, [id]);

  const loadGrant = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getGrant(id);
      setGrant(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this grant API?'))
      return;
    try {
      await api.deleteGrant(id);
      navigate('/');
    } catch (err) {
      alert('Failed to delete grant: ' + (err as Error).message);
    }
  };

  const handleEdit = async (formData: Partial<Grant>) => {
    if (!id) return;
    try {
      await api.updateGrant(id, formData);
      loadGrant();
      onClose();
    } catch (err) {
      alert('Failed to update grant: ' + (err as Error).message);
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return 'Never';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} days`;
    return `${hours} hours`;
  };

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error || !grant) {
    return (
      <Center h="50vh">
        <VStack gap={4}>
          <Text color="red.500">Failed to load grant: {error}</Text>
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
              Grant: {grant.name}
            </Heading>
          </VStack>
          <HStack gap={2}>
            <Button
              colorScheme="blue"
              variant="outline"
              size="sm"
              onClick={onOpen}
            >
              Edit
            </Button>
            {grant.state === 'active' ? (
              <Button
                colorScheme="red"
                variant="outline"
                onClick={handleDelete}
                size="sm"
              >
                Delete
              </Button>
            ) : (
              <StateBadge state="deleted" />
            )}
          </HStack>
        </HStack>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
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
                  {grant.id}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Name
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {grant.name}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Type
                </Text>
                <TypeBadge
                  type={typeof grant.type === 'object' ? grant.type?.name || '' : grant.type}
                />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Account
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {grant.account}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  State
                </Text>
                <StateBadge state={grant.state} />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Default Revoke Time
                </Text>
                <Text fontSize="sm">{formatDuration(grant.defaultRevokeTime)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Created
                </Text>
                <Text fontSize="sm">
                  {grant.createdAt
                    ? new Date(grant.createdAt).toLocaleString()
                    : '-'}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={styles.textMuted}>
                  Updated
                </Text>
                <Text fontSize="sm">
                  {grant.updatedAt
                    ? new Date(grant.updatedAt).toLocaleString()
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
              Connection Details
            </Text>
            <VStack align="stretch" gap={3}>
              <Box>
                <Text fontSize="sm" color={styles.textMuted} mb={1}>
                  Base URL
                </Text>
                <Text
                  fontSize="sm"
                  fontFamily="mono"
                  p={2}
                  bg={styles.code}
                  borderRadius="md"
                >
                  {grant.baseURL}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color={styles.textMuted} mb={1}>
                  Secret
                </Text>
                <Text
                  fontSize="sm"
                  fontFamily="mono"
                  p={2}
                  bg={styles.code}
                  borderRadius="md"
                >
                  {grant.secret ? '••••••••••••••••' : 'Not set'}
                </Text>
              </Box>
            </VStack>
          </Box>
        </Grid>

        <Box bg={styles.bg} {...cardStyles} borderColor={styles.border}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            mb={3}
            color={styles.textMuted}
          >
            Raw Configuration
          </Text>
          <Box
            as="pre"
            p={3}
            bg={styles.code}
            borderRadius="md"
            fontFamily="mono"
            fontSize="xs"
            overflowX="auto"
          >
            {JSON.stringify(grant, null, 2)}
          </Box>
        </Box>
      </VStack>

      <Dialog.Root
        open={open}
        onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
        size="md"
      >
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content bg={styles.bg} border="1px solid" borderColor={styles.border}>
            <Dialog.Header
              fontFamily="mono"
              fontSize="sm"
              letterSpacing="0.08em"
            >
              Edit Grant API
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <GrantForm
                initial={grant}
                onSave={handleEdit}
                onCancel={onClose}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
