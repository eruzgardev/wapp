import "@/styles/globals.css";
import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  Theme,
} from "@chakra-ui/react";
const chakraTheme = createSystem(defaultConfig);

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider value={chakraTheme}>
      <Theme colorPalette="dark">
        <Component {...pageProps} />
      </Theme>
    </ChakraProvider>
  );
}
