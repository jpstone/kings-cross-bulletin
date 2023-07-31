import { StatusBar } from 'expo-status-bar';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Image,
  Platform,
  Animated,
  Modal,
  ScrollView,
  Dimensions,
  RefreshControl,
  useWindowDimensions,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery, exchangeCodeAsync } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_200ExtraLight,
  Poppins_500Medium,
  Poppins_300Light,
  Poppins_300Light_Italic,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { AntDesign, EvilIcons, Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { FAB } from "@react-native-material/core";

async function save(key, value) {
  return await SecureStore.setItemAsync(key, value);
}

async function del(key) {
  return await SecureStore.deleteItemAsync(key);
}

async function getValueFor(key) {
  const result = await SecureStore.getItemAsync(key);
  return result;
}

WebBrowser.maybeCompleteAuthSession();
const isAndroid = Platform.OS === 'android';
const CLIENT_ID = 'bulletin';
const logo = 'https://cms.stonejustin.com/assets/1b812127-173c-40ca-bc3b-addb2dcd8d24';
const red = '#8F1B1E';
const black = '#141414';
const cmsAxios = axios.create({
  baseURL: 'https://cmsapi.stonejustin.com'
});

const redirectUri = makeRedirectUri({
  scheme: 'bulletin'
});

const config = {
  redirectUrl: 'expo://localhost:19000',
  scopes: ['openid', 'profile']
};

function Loading() {
  return (
    <ActivityIndicator style={loadingStyles.container} size="large" color={red} />
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function App() {
  const [areFontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_200ExtraLight,
    Poppins_500Medium,
    Poppins_300Light,
    Poppins_300Light_Italic,
    Poppins_600SemiBold,
  });
  const discovery = useAutoDiscovery('https://sso.stonejustin.com/realms/kings-cross');
  const [session, setSession] = React.useState();
  const [req, res, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      redirectUri: makeRedirectUri({
        scheme: 'bulletin'
      }),
      usePKCE: true,
    },
    discovery,
  );

  const {
    // The token will be auto exchanged after auth completes.
    token,
    exchangeError,
  } = useAutoExchange(
    res?.type === 'success' ? res.params.code : null,
    req?.codeVerifier,
    discovery,
  );

  React.useEffect(() => {
    async function handleToken(){
      let accessToken = await getValueFor('accessToken');
      let refreshToken = await getValueFor('refreshToken');

      if (accessToken === null || refreshToken === null) {
        if (token?.refreshToken && token?.accessToken) {
          await save('accessToken', token.accessToken);
          await save('refreshToken', token.refreshToken);
          accessToken = await getValueFor('accessToken');
          refreshToken = await getValueFor('refreshToken');
        }
      }

      setSession({ accessToken, refreshToken });
    }

    handleToken();

  }, [token]);

  function clearSession() {
    del('accessToken', null);
    del('refreshToken', null);
    setSession(null);
  }

  const onLayoutRootView = React.useCallback(async () => {
    if (areFontsLoaded && req) {
      await SplashScreen.hideAsync();
    }
  }, [areFontsLoaded]);

  const isAppReady = () => areFontsLoaded && req;

  if (!isAppReady()) {
    return null;
  }

  return (
    session?.accessToken ? (
      <LoggedIn clearSession={clearSession} session={session} onLayoutRootView={onLayoutRootView} />
    ) : (
      <LoggedOut onLayoutRootView={onLayoutRootView} promptAsync={promptAsync} />
    )
  );
}

function LoggedOut({ promptAsync, onLayoutRootView }) {
  return (
    <View
      onLayout={onLayoutRootView}
      style={styles.loggedOut.container}
    >
      <Image
        style={styles.loggedOut.logo}
        source={{ uri: logo }}
      />
      <Text style={styles.loggedOut.title}>
        King's Cross Bulletin
      </Text>
      <TouchableOpacity
        style={styles.loggedOut.button}
        onPress={() => {
          promptAsync();
        }}
      >
        <Text style={styles.loggedOut.buttonText}>
          Log In
        </Text>
      </TouchableOpacity>
      <Text style={styles.loggedOut.signUpText}>
        Sign Up
      </Text>
      <Text style={styles.loggedOut.guestText}>
        Continue as guest
      </Text>
    </View>
  );
}

function PopUp({ isVisible, setIsVisible, title, children }) {
  return (
    <View style={modalStyles.container}>
      <Modal
        visible={isVisible}
        onRequestClose={() => setIsVisible(!isVisible)}
        animationType='slide'
      >
        <ScrollView contentContainerStyle={modalStyles.content}>
          <View style={modalStyles.closeContainer}>
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => setIsVisible(!isVisible)}
            >
              <EvilIcons
                style={modalStyles.closeIcon}
                name="close"
              />
            </TouchableOpacity>
          </View>
          <View style={modalStyles.titleContainer}>
            <Text style={modalStyles.title}>
              {title}
            </Text>
          </View>
          {children}
        </ScrollView>
      </Modal>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  titleContainer: {
    paddingLeft: 16,
    paddingTop: 32,
    paddingBottom: 24,
    width: '90%',
  },
  title: {
    fontFamily: 'Poppins_200ExtraLight',
    fontSize: 32,
  },
  container: {},
  content: {},
  closeButton: {},
  closeContainter: {},
  closeIcon: {
    alignSelf: 'flex-end',
    fontSize: 56,
    right: 0,
    padding: 8,
    color: black,
  },
});

function TopBar() {
  return (
    <React.Fragment>
      <View style={styles.loggedIn.topBarContainer}>
        <Image
          style={styles.loggedIn.topBarLogo}
          source={{ uri: logo }}
        />
        <Text style={styles.loggedIn.topBarText}>
          King's Cross Bulletin
        </Text>
      </View>
      <View style={styles.loggedIn.dateBarContainer}>
        <Text style={styles.loggedIn.dateBarTopText}>
          Order of Service
        </Text>
        <Text style={styles.loggedIn.dateBarBottomText}>
          July 30, 2023
        </Text>
      </View>
    </React.Fragment>
  );
}

function SubSectionGroup({ data }) {
  const { width } = useWindowDimensions();

  if (data.sermon) {
    return (
      <RenderHtml
        baseStyle={{fontSize: 16}}
        width={width}
        source={{html: data.sermon?.value }}
        contentWidth={width}
      />
    );
  }

  if (data.song || data.scripture_text) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <React.Fragment>
      <PopUp
                     isVisible={isVisible}
      setIsVisible={setIsVisible}
      title={data.name}
      >
           <View style={{paddingLeft: 16, paddingRight: 16}}>
             <RenderHtml
              baseStyle={{fontSize: 16}}
              width={width}
              source={{html: data.song?.value || data.scripture_text }}
              contentWidth={width}
            />
          </View>
        </PopUp>
        <TouchableOpacity
          style={styles.loggedIn.modalButton}
          onPress={() => setIsVisible(true)}
        >
          <Text style={styles.loggedIn.modalButtonText}>
            {data.name}
          </Text>
        </TouchableOpacity>
      </React.Fragment>
    );
  }

  if (data.catechism) {
    return (
      <React.Fragment>
        <Text style={styles.loggedIn.sectionSubHeader}>
          Minister
        </Text>
        <Text style={styles.loggedIn.sectionText}>
          {data.catechism.question}
        </Text>
        <Text style={styles.loggedIn.sectionSubHeader}>
          Congregation
        </Text>
        <Text style={styles.loggedIn.sectionText}>
          {data.catechism.answer}
        </Text>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      {data.name && (
        <Text style={styles.loggedIn.sectionSubHeader}>
          {data.name}
        </Text>
      )}
      {data.value && (
        <Text style={styles.loggedIn.sectionText}>
          {data.value}
        </Text>
      )}
    </React.Fragment>
  );
}

function SubSection({ data }) {
  return (
    <View key={data.name} style={styles.loggedIn.sectionContainer}>
      <Text style={styles.loggedIn.sectionHeader}>
        {data.name}
      </Text>
      {data.position && (
        <View style={{flexDirection: 'row', marginTop: -5, marginBottom: 10 }}>
          <View
            style={{
              borderBottomColor: black,
              borderBottomWidth: 2,
              width: 50,
              bottom: 12,
            }}
          />
          <Text style={{
            fontFamily: 'Poppins_400Regular',
            textTransform: 'capitalize',
            paddingLeft: 16,
            paddingRight: 16,
          }}>
            {data.position.name}
          </Text>
          <View
            style={{
              borderBottomColor: black,
              borderBottomWidth: 2,
              width: 50,
              bottom: 12,
            }}
          />
        </View>
      )}
      {data.sub_section_groups.map(({ sub_section_group_id }) => (
        <SubSectionGroup key={sub_section_group_id.id} data={sub_section_group_id} />
      ))}
    </View>
  );
}

function Page({ pages, isLoading, children, currentPage, setCurrentPage, data, session, setPageData, onRefresh, isRefreshing }) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <View style={styles.loggedIn.mainContainer}>
      <PopUp isVisible={isVisible} setIsVisible={setIsVisible} title='Table of Contents'>
        <View style={pageStyles.tocContainer}>
          {pages.map(({ name, display_name }) => (
            <TouchableOpacity
              key={name}
              onPress={() => {
                setCurrentPage(name);
                setIsVisible(!isVisible);
              }}
            >
              <Text style={pageStyles.tocText}>
                {display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PopUp>
      <TouchableOpacity
        style={styles.loggedIn.titleSelect}
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.loggedIn.pageTitle}>
          {pages.find(({ name }) => name === currentPage).display_name}
        </Text>
        <AntDesign style={styles.loggedIn.titleDropdown} name="caretdown" />
      </TouchableOpacity>
      {data?.position && (
        <View style={{flexDirection: 'row', marginTop: -15 }}>
          <View
            style={{
              borderBottomColor: black,
              borderBottomWidth: 2,
              width: 50,
              bottom: 12,
            }}
          />
          <Text style={{
            fontFamily: 'Poppins_400Regular',
            textTransform: 'capitalize',
            paddingLeft: 16,
            paddingRight: 16,
          }}>
            {data.position.name}
          </Text>
          <View
            style={{
              borderBottomColor: black,
              borderBottomWidth: 2,
              width: 50,
              bottom: 12,
            }}
          />
        </View>
      )}
      {isLoading ? (
        <Loading />
      ) : (
        <ScrollView
          style={{paddingLeft: 32, paddingRight: 32, width: Dimensions.get('window').width}}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {data?.sub_sections.map(({ sub_section_id }) => (
            <SubSection key={sub_section_id.id} data={sub_section_id} />
          ))}
        </ScrollView>
      )}
      <View style={pageStyles.fabButtonContainer}>
        {data?.prev && (
          <TouchableOpacity onPress={() => setCurrentPage(data.prev)}>
            <Ionicons style={pageStyles.fabLeft} color={red} name="arrow-back-circle-outline" size={56} />
          </TouchableOpacity>
        )}
        {data?.next && (
          <TouchableOpacity onPress={() => setCurrentPage(data.next)}>
            <Ionicons style={pageStyles.fabRight} color={red} name="arrow-forward-circle-sharp" size={56} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

}

const pageStyles = StyleSheet.create({
  fabButtonContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    gap: 16,
    flex: 1,
  },
  fab: {

  },
  tocContainer: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  tocText: {
    fontFamily: 'Poppins_600SemiBold',
    color: red,
    fontSize: 20,
    textTransform: 'uppercase',
    paddingTop: 8,
    paddingBottom: 8,
  },
});

function getHeaders(refreshToken) {
  return {
    headers: {
      'x-refresh-token': refreshToken,
      'x-client-id': 'bulletin',
      'x-realm-name': 'kings-cross',
    },
  };
}

function LoggedIn({ clearSession, onLayoutRootView, session }) {
  const [meta, setMeta] = React.useState();
  const [isVisible, setIsVisible] = React.useState(false);
  const [cmsData, setCmsData] = React.useState();
  const [currentPage, setCurrentPage] = React.useState();
  const [pageData, setPageData] = React.useState({});
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    async function getMeta() {
      const { data: { data: { value }}} = await cmsAxios.get('/meta', getHeaders(session.refreshToken));
      setMeta(value);
      setCurrentPage('next_week');
    }

    if (!meta) {
      getMeta();
    }
  }, []);

  React.useEffect(() => {
    async function fetchData() {
      const { data: { data }} = await cmsAxios.get(`${currentPage}${meta.query}`, getHeaders(session.refreshToken));

      setPageData({ ...pageData, [currentPage]: data });
      setIsLoading(false);
    }

    if (!pageData[currentPage] && meta) {
      setIsLoading(true);
      fetchData();
    }

  }, [currentPage]);


  const onRefresh = React.useCallback(() => {
    setIsRefreshing(true);

    async function fetchData() {
      const { data: { data }} = await cmsAxios.get(`${currentPage}${meta.query}`, getHeaders(session.refreshToken));
      setPageData({ [currentPage]: data });
      setIsRefreshing(false);
    }

    fetchData();
  });

  cmsAxios.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;
  cmsAxios.interceptors.response.use((res) => res, (e) => {
    if (e.response.status === 401) {
      clearSession();
    }
  });

  React.useEffect(() => {
    const backAction = () => {
      if (pageData[currentPage]?.prev) {
        setCurrentPage(pageData[currentPage].prev);
        return true;
      }

      BackHandler.exitApp();
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [pageData, currentPage]);

  return currentPage && (
    <View
      onLayout={onLayoutRootView}
      style={styles.loggedIn.container}
    >
      <TopBar />
      <Page
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        data={pageData[currentPage]}
        session={session}
        setPageData={setPageData}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        pages={meta.pages}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loggedIn: {
    container: {
      flex: 1,
      backgroundColor: red,
    },
    modalButtonText: {
      color: red,
      fontFamily: 'Poppins_500Medium',
      fontSize: 16,
      textAlign: 'center',
    },
    modalButton: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 32,
      paddingRight: 32,
      borderColor: red,
      borderWidth: 1,
      marginBottom: 10,
    },
    titleDropdown: {
      color: black,
      paddingTop: 12,
      paddingLeft: 6,
    },
    titleSelect: {
      flexDirection: 'row',
    },
    sectionText: {
      fontFamily: 'Poppins_300Light',
      color: black,
      fontSize: 16,
      padding: 2,
      textAlign: 'center',
    },
    sectionTextItalic: {
      fontFamily: 'Poppins_300Light_Italic',
      color: black,
      fontSize: 16,
      padding: 2,
      textAlign: 'center',
    },
    sectionSubHeader: {
      color: red,
      fontFamily: 'Poppins_500Medium',
      fontSize: 16,
    },
    sectionContainer: {
      paddingTop: 16,
      paddingBottom: 16,
      alignItems: 'center',
    },
    sectionHeader: {
      fontFamily: 'Poppins_300Light',
      fontSize: 24,
      color: black,
      textAlign: 'center',
    },
    mainContainer: {
      paddingTop: 24,
      paddingBottom: 64,
      flex: 1,
      backgroundColor: 'white',
      alignItems: 'center',
    },
    pageTitle: {
      color: red,
      fontFamily: 'Poppins_400Regular',
      fontSize: 24,
      paddingBottom: 12,
    },
    dateBarContainer: {
      height: 64,
      backgroundColor: black,
      alignItems: 'center',
    },
    dateBarTopText: {
      paddingTop: 5,
      color: 'white',
      fontFamily: 'Poppins_400Regular',
      fontSize: 18,
      marginBottom: -5,
    },
    dateBarBottomText: {
      color: '#A7A7A7',
      fontSize: 18,
    },
    topBarContainer: {
      padding: 36,
      height: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topBarText: {
      color: 'white',
      paddingTop: 6,
      fontSize: 28,
      fontFamily: 'Poppins_400Regular'
    },
    topBarLogo: {
      height: '90%',
      width: '15%',
    },
  },
  loggedOut: {
    container: {
      flex: 1,
      backgroundColor: red,
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Poppins_400Regular'
    },
    title: {
      padding: 18,
      fontSize: 28,
      color: 'white',
      fontFamily: 'Poppins_400Regular',
    },
    logo: {
      height: '20%',
      width: '50%',
    },
    button: {
      backgroundColor: '#fff',
      color: red,
      borderRadius: 16,
    },
    buttonText: {
      color: red,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 48,
      paddingRight: 48,
      fontFamily: 'Poppins_400Regular',
      fontSize: 28,
    },
    signUpText: {
      color: 'white',
      padding: 32,
      fontFamily: 'Poppins_400Regular',
      fontSize: 28,
    },
    guestText: {
      padding: 16,
      color: 'white',
      fontFamily: 'Poppins_400Regular_Italic',
      fontSize: 16,
      position: 'absolute',
      bottom: 0,
    }
  },
});

function useAutoExchange(code, code_verifier, discovery) {
  const [state, setState] = React.useReducer(
    (state, action) => ({ ...state, ...action }),
    { token: null, exchangeError: null }
  );
  const isMounted = useMounted();

  React.useEffect(() => {
    if (!code) {
      setState({ token: null, exchangeError: null });
      return;
    }

    exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        code,
        redirectUri,
        extraParams: {
          code_verifier,
        },
      },
      discovery
    )
      .then((token) => {
        if (isMounted.current) {
          setState({ token, exchangeError: null });
        }
      })
      .catch((exchangeError) => {
        if (isMounted.current) {
          setState({ exchangeError, token: null });
        }
      });
  }, [code]);

  return state;
}

function useMounted() {
  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
}
