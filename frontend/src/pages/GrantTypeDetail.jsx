import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, VStack, HStack, Text, Heading, Button, Badge, Tabs } from "@chakra-ui/react";
import { api } from "../api";
import { useColorModeValue } from "../App";

export function GrantTypeDetail() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [grantType, setGrantType] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const bg = useColorModeValue("white", "surface.800");
  const border = useColorModeValue("gray.200", "surface.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const mutedColor = useColorModeValue("gray.600", "gray.500");
  const codeBg = useColorModeValue("gray.50", "surface.900");

  useEffect(() => {
    loadGrantType();
  }, [type]);

  const loadGrantType = async () => {
    try {
      setLoading(true);
      const data = await api.getGrantType(type);
      setGrantType(data);
      // In a real implementation, you'd fetch error logs from an API endpoint
      setErrorLogs([]);
    } catch (err) {
      console.error("Failed to load grant type:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p={8}>
        <Text fontFamily="mono" color={mutedColor}>Loading...</Text>
      </Box>
    );
  }

  if (!grantType) {
    return (
      <Box p={8}>
        <Text fontFamily="mono" color="red.500">Grant API type not found</Text>
        <Button mt={4} onClick={() => navigate("/")} fontFamily="mono">Back to Dashboard</Button>
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" p={8} bg={useColorModeValue("gray.50", "surface.900")}>
      <Box maxW="1000px" mx="auto">
        <VStack gap={6} align="stretch">
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Heading size="md" fontFamily="mono" letterSpacing="0.06em" color={textColor}>
                Grant API Type
              </Heading>
              <HStack gap={2} mt={2}>
                <Badge colorPalette="blue" fontFamily="mono" fontSize="md" px={3} py={1}>
                  {grantType.name}
                </Badge>
              </HStack>
            </VStack>
            <Button size="sm" onClick={() => navigate("/")} fontFamily="mono" variant="outline">
              Back to Dashboard
            </Button>
          </HStack>

          <Tabs.Root defaultValue="codes">
            <Tabs.List>
              <Tabs.Trigger value="codes" fontFamily="mono">Operation Codes</Tabs.Trigger>
              <Tabs.Trigger value="logs" fontFamily="mono">Error Logs ({errorLogs.length})</Tabs.Trigger>
            </Tabs.List>
            
            <Tabs.Content value="codes">
              <VStack gap={4} align="stretch">
                <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" p={4}>
                  <Text fontSize="10px" fontFamily="mono" letterSpacing="0.12em" textTransform="uppercase" color="gray.500" mb={2}>
                    Grant Code
                  </Text>
                  <Box bg={codeBg} p={3} borderRadius="6px" overflow="auto">
                    <Text fontSize="11px" fontFamily="mono" color={textColor} whiteSpace="pre-wrap">
                      {grantType.grantCode}
                    </Text>
                  </Box>
                </Box>

                <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" p={4}>
                  <Text fontSize="10px" fontFamily="mono" letterSpacing="0.12em" textTransform="uppercase" color="gray.500" mb={2}>
                    Revoke Code
                  </Text>
                  <Box bg={codeBg} p={3} borderRadius="6px" overflow="auto">
                    <Text fontSize="11px" fontFamily="mono" color={textColor} whiteSpace="pre-wrap">
                      {grantType.revokeCode}
                    </Text>
                  </Box>
                </Box>

                <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" p={4}>
                  <Text fontSize="10px" fontFamily="mono" letterSpacing="0.12em" textTransform="uppercase" color="gray.500" mb={2}>
                    Status Code
                  </Text>
                  <Box bg={codeBg} p={3} borderRadius="6px" overflow="auto">
                    <Text fontSize="11px" fontFamily="mono" color={textColor} whiteSpace="pre-wrap">
                      {grantType.getStatusCode}
                    </Text>
                  </Box>
                </Box>
              </VStack>
            </Tabs.Content>

            <Tabs.Content value="logs">
              <Box bg={bg} border="1px solid" borderColor={border} borderRadius="10px" p={4} minHeight="200px">
                {errorLogs.length === 0 ? (
                  <Text fontSize="12px" fontFamily="mono" color={mutedColor} textAlign="center" py={8}>
                    No error logs available
                  </Text>
                ) : (
                  <VStack gap={2} align="stretch">
                    {errorLogs.map((log, index) => (
                      <Box key={index} p={3} bg={codeBg} borderRadius="6px">
                        <Text fontSize="11px" fontFamily="mono">{log.message}</Text>
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </VStack>
      </Box>
    </Box>
  );
}
