/** @format */

export const useCommonStyles = (
  useColorModeValue: <T>(light: T, dark: T) => T
) => ({
  bg: useColorModeValue('white', 'surface.800'),
  bgSecondary: useColorModeValue('gray.50', 'surface.900'),
  border: useColorModeValue('gray.200', 'surface.600'),
  header: useColorModeValue('gray.50', 'surface.700'),
  text: useColorModeValue('gray.800', 'gray.100'),
  textMuted: useColorModeValue('gray.600', 'gray.400'),
  hover: useColorModeValue('gray.50', 'surface.700'),
  code: useColorModeValue('gray.100', 'surface.800'),
});

export const cardStyles = {
  border: '1px solid',
  borderRadius: 'md',
  p: 4,
};

export const tableStyles = {
  header: {
    fontFamily: 'mono',
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'gray.400',
    py: 3,
  },
  cell: {
    fontSize: '12px',
    fontFamily: 'mono',
  },
};

export const linkStyles = {
  color: 'brand.500',
  _hover: { textDecoration: 'underline' },
  cursor: 'pointer',
};

export const monoText = {
  fontFamily: 'mono',
};

export const labelText = {
  fontSize: '11px',
  fontFamily: 'mono',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'gray.500',
};
