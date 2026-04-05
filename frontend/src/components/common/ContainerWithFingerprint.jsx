import { HStack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

export const ContainerWithFingerprint = ({ container, useColorModeValue }) => {
  if (!container) return null;
  
  const textMuted = useColorModeValue("gray.600", "gray.400");
  
  const truncateFp = (fp) => {
    if (!fp) return '';
    return fp.length > 24 ? fp.substring(0, 24) + '...' : fp;
  };

  return (
    <RouterLink to={`/container/${container.id}`}>
      <HStack gap={1} _hover={{ opacity: 0.8 }}>
        <Text fontSize="10px" fontFamily="mono" color="brand.500" _hover={{ textDecoration: 'underline' }}>
          {container.uniqueName}
        </Text>
        <Text fontSize="10px" fontFamily="mono" color={textMuted}>
          {truncateFp(container.fingerprint)}
        </Text>
      </HStack>
    </RouterLink>
  );
};
