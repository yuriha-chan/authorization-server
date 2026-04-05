/** @format */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Badge,
  Tabs,
} from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import { api } from '../api';
import { useColorModeValue } from '../hooks/useColorMode';
import { CodeEditor } from '../components/CodeEditor';
import type { GrantType } from '../types';

export function GrantTypeDetail() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [grantType, setGrantType] = useState<GrantType | null>(null);
  const [originalGrantType, setOriginalGrantType] = useState<GrantType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('grant');

  const bg = useColorModeValue('white', 'surface.800');
  const border = useColorModeValue('gray.200', 'surface.600');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.500');
  const mainBg = useColorModeValue('gray.50', 'surface.900');

  const loadGrantType = useCallback(async () => {
    if (!type) return;
    try {
      setLoading(true);
      const data = await api.getGrantType(type);
      setGrantType(data);
      setOriginalGrantType(data);
    } catch (err) {
      console.error('Failed to load grant type:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to load grant type',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadGrantType();
  }, [loadGrantType]);

  const hasUnsavedChanges = useCallback(() => {
    if (!grantType || !originalGrantType) return false;
    return (
      grantType.grantCode !== originalGrantType.grantCode ||
      grantType.revokeCode !== originalGrantType.revokeCode ||
      grantType.getStatusCode !== originalGrantType.getStatusCode
    );
  }, [grantType, originalGrantType]);

  const handleSave = async () => {
    if (!grantType) return;
    try {
      setSaving(true);
      await api.updateGrantType(grantType.name, {
        grantCode: grantType.grantCode,
        revokeCode: grantType.revokeCode,
        getStatusCode: grantType.getStatusCode,
      });
      setOriginalGrantType(grantType);
      toaster.create({
        title: 'Saved',
        description: 'Grant API type updated successfully',
        type: 'success',
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to save:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to save changes',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateCode = (field: 'grantCode' | 'revokeCode' | 'getStatusCode', value: string) => {
    setGrantType((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (loading) {
    return (
      <Box p={8} bg={mainBg} minHeight="100vh">
        <Text fontFamily="mono" color={mutedColor}>
          Loading...
        </Text>
      </Box>
    );
  }

  if (!grantType) {
    return (
      <Box p={8} bg={mainBg} minHeight="100vh">
        <Text fontFamily="mono" color="red.500">
          Grant API type not found
        </Text>
        <Button mt={4} onClick={() => navigate('/')} fontFamily="mono">
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const unsaved = hasUnsavedChanges();

  return (
    <Box minHeight="100vh" p={8} bg={mainBg}>
      <Box maxW="1200px" mx="auto">
        <VStack gap={6} align="stretch">
          <HStack justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Heading
                size="md"
                fontFamily="mono"
                letterSpacing="0.06em"
                color={textColor}
              >
                Grant API Type
              </Heading>
              <HStack gap={2} mt={2}>
                <Badge
                  colorPalette="blue"
                  fontFamily="mono"
                  fontSize="md"
                  px={3}
                  py={1}
                >
                  {grantType.name}
                </Badge>
              </HStack>
            </VStack>
            <HStack gap={3}>
              {unsaved && (
                <Badge
                  colorPalette="yellow"
                  fontFamily="mono"
                  fontSize="xs"
                  px={2}
                  py={1}
                >
                  Unsaved Changes
                </Badge>
              )}
              <Button
                size="sm"
                colorPalette="brand"
                onClick={handleSave}
                loading={saving}
                disabled={!unsaved}
                fontFamily="mono"
              >
                Save
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/')}
                fontFamily="mono"
                variant="outline"
              >
                Back to Dashboard
              </Button>
            </HStack>
          </HStack>

          <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
            <Tabs.List>
              <Tabs.Trigger value="grant" fontFamily="mono">
                Grant Code
              </Tabs.Trigger>
              <Tabs.Trigger value="revoke" fontFamily="mono">
                Revoke Code
              </Tabs.Trigger>
              <Tabs.Trigger value="status" fontFamily="mono">
                Status Code
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="grant" pt={4}>
              <Box
                bg={bg}
                border="1px solid"
                borderColor={border}
                borderRadius="10px"
                overflow="hidden"
              >
                <Box
                  p={3}
                  bg={useColorModeValue('gray.50', 'surface.700')}
                  borderBottom="1px solid"
                  borderColor={border}
                >
                  <Text
                    fontSize="10px"
                    fontFamily="mono"
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    color="gray.500"
                  >
                    Grant Function
                  </Text>
                </Box>
                <Box p={4}>
                  <CodeEditor
                    value={grantType.grantCode}
                    onChange={(value) => updateCode('grantCode', value)}
                    placeholder="async function grant(secrets, account, realm) { ... }"
                  />
                </Box>
              </Box>
            </Tabs.Content>

            <Tabs.Content value="revoke" pt={4}>
              <Box
                bg={bg}
                border="1px solid"
                borderColor={border}
                borderRadius="10px"
                overflow="hidden"
              >
                <Box
                  p={3}
                  bg={useColorModeValue('gray.50', 'surface.700')}
                  borderBottom="1px solid"
                  borderColor={border}
                >
                  <Text
                    fontSize="10px"
                    fontFamily="mono"
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    color="gray.500"
                  >
                    Revoke Function
                  </Text>
                </Box>
                <Box p={4}>
                  <CodeEditor
                    value={grantType.revokeCode}
                    onChange={(value) => updateCode('revokeCode', value)}
                    placeholder="async function revoke(secrets, account, token) { ... }"
                  />
                </Box>
              </Box>
            </Tabs.Content>

            <Tabs.Content value="status" pt={4}>
              <Box
                bg={bg}
                border="1px solid"
                borderColor={border}
                borderRadius="10px"
                overflow="hidden"
              >
                <Box
                  p={3}
                  bg={useColorModeValue('gray.50', 'surface.700')}
                  borderBottom="1px solid"
                  borderColor={border}
                >
                  <Text
                    fontSize="10px"
                    fontFamily="mono"
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    color="gray.500"
                  >
                    Status Function
                  </Text>
                </Box>
                <Box p={4}>
                  <CodeEditor
                    value={grantType.getStatusCode}
                    onChange={(value) => updateCode('getStatusCode', value)}
                    placeholder="async function getStatus(secrets, account, token) { ... }"
                  />
                </Box>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </VStack>
      </Box>
    </Box>
  );
}
