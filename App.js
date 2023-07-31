import { StatusBar } from 'expo-status-bar';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
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
import { FAB } from "@react-native-material/core";
import { Image } from 'expo-image';

const isAndroid = Platform.OS === 'android';
const CLIENT_ID = 'bulletin';
const red = '#8F1B1E';
const black = '#141414';
const cmsAxios = axios.create({
  baseURL: 'https://cmsapi.stonejustin.com'
});

const config = {
  redirectUrl: 'expo://localhost:19000',
  scopes: ['openid', 'profile']
};

function Loading({ styles }) {
  return (
    <ActivityIndicator style={styles.loading.container} size="large" color={red} />
  );
}

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

  const onLayoutRootView = React.useCallback(async () => {
    if (areFontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [areFontsLoaded]);

  const isAppReady = () => Boolean(areFontsLoaded);

  if (!isAppReady()) {
    return null;
  }

  return (
    <Main onLayoutRootView={onLayoutRootView} />
  );
}

function PopUp({ styles, isVisible, setIsVisible, title, children }) {
  return (
    <View style={styles.popUp.container}>
      <Modal
        visible={isVisible}
        onRequestClose={() => setIsVisible(!isVisible)}
        animationType='slide'
      >
        <ScrollView contentContainerStyle={styles.popUp.content}>
          <View style={styles.popUp.closeContainer}>
            <TouchableOpacity
              style={styles.popUp.closeButton}
              onPress={() => setIsVisible(!isVisible)}
            >
              <EvilIcons
                style={styles.popUp.closeIcon}
                name="close"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.popUp.titleContainer}>
            <Text style={styles.popUp.title}>
              {title}
            </Text>
          </View>
          {children}
        </ScrollView>
      </Modal>
    </View>
  );
}

function TopBar({ styles }) {
  return (
    <React.Fragment>
      <View style={styles.main.topBarContainer}>
        <Image
          style={styles.main.topBarLogo}
          source={require('./assets/logo.jpeg')}
        />
        <Text style={styles.main.topBarText}>
          King's Cross Bulletin
        </Text>
      </View>
      <View style={styles.main.dateBarContainer}>
        <Text style={styles.main.dateBarTopText}>
          Order of Service
        </Text>
        <Text style={styles.main.dateBarBottomText}>
          July 30, 2023
        </Text>
      </View>
    </React.Fragment>
  );
}

function SubSectionGroup({ data, styles }) {
  const { width } = useWindowDimensions();

  if (data.song || (!data.sermon && data.scripture_text) || data.sermon) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <React.Fragment>
        <PopUp
          styles={styles}
          isVisible={isVisible}
          setIsVisible={setIsVisible}
          title={data.name}
        >
          <View style={{paddingLeft: 16, paddingRight: 16}}>
            <RenderHtml
              baseStyle={{fontSize: 16}}
              width={width}
              source={{html: data.song?.value || data.scripture_text || data.sermon?.value }}
              contentWidth={width}
            />
          </View>
        </PopUp>
        <TouchableOpacity
          style={styles.main.modalButton}
          onPress={() => setIsVisible(true)}
        >
          <Text style={styles.main.modalButtonText}>
            {data.name}
          </Text>
        </TouchableOpacity>
      </React.Fragment>
    );
  }

  if (data.catechism) {
    return (
      <React.Fragment>
        <Text style={styles.main.sectionSubHeader}>
          Minister
        </Text>
        <Text style={styles.main.sectionText}>
          {data.catechism.question}
        </Text>
        <Text style={styles.main.sectionSubHeader}>
          Congregation
        </Text>
        <Text style={styles.main.sectionText}>
          {data.catechism.answer}
        </Text>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      {data.name && (
        <Text style={styles.main.sectionSubHeader}>
          {data.name}
        </Text>
      )}
      {data.value && (
        <Text style={styles.main.sectionText}>
          {data.value}
        </Text>
      )}
    </React.Fragment>
  );
}

function SubSection({ data, styles }) {
  return (
    <View key={data.name} style={styles.main.sectionContainer}>
      <Text style={styles.main.sectionHeader}>
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
        <SubSectionGroup styles={styles} key={sub_section_group_id.id} data={sub_section_group_id} />
      ))}
    </View>
  );
}

function Page({ styles, pages, isLoading, children, currentPage, setCurrentPage, data, setPageData, onRefresh, isRefreshing }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const scrollRef = React.useRef();

  scrollRef.current?.scrollTo({ y: 0, animated: false });

  return (
    <View style={styles.main.mainContainer}>
      <PopUp styles={styles} isVisible={isVisible} setIsVisible={setIsVisible} title='Table of Contents'>
        <View style={styles.page.tocContainer}>
          {pages.map(({ name, display_name }) => (
            <TouchableOpacity
              key={name}
              onPress={() => {
                setCurrentPage(name);
                setIsVisible(!isVisible);
              }}
            >
              <Text style={styles.page.tocText}>
                {display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PopUp>
      <View style={{...styles.main.titleContainer, paddingBottom: data?.position ? styles.main.titleContainer.paddingBottom : styles.main.titleContainer.paddingBottom - 8}}>
        <TouchableOpacity
          style={styles.main.titleSelect}
          onPress={() => setIsVisible(!isVisible)}
        >
          <Text style={styles.main.pageTitle}>
            {pages.find(({ name }) => name === currentPage).display_name}
          </Text>
          <AntDesign style={styles.main.titleDropdown} name="caretdown" />
        </TouchableOpacity>
      </View>
      {data?.position && (
        <View style={{flexDirection: 'row', marginTop: -30, zIndex: 2 }}>
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
        <Loading styles={styles} />
      ) : (
        <ScrollView
          style={{...styles.page.scrollView, width: Dimensions.get('window').width}}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          ref={scrollRef}
        >
          {data?.sub_sections.map(({ sub_section_id }) => (
            <SubSection styles={styles} key={sub_section_id.id} data={sub_section_id} />
          ))}
        </ScrollView>
      )}
      <View style={styles.page.fabButtonContainer}>
        {data?.prev && (
          <TouchableOpacity onPress={() => setCurrentPage(data.prev)}>
            <Ionicons style={styles.page.fabLeft} color={red} name="arrow-back-circle-outline" size={56} />
          </TouchableOpacity>
        )}
        {data?.next && (
          <TouchableOpacity onPress={() => setCurrentPage(data.next)}>
            <Ionicons style={styles.page.fabRight} color={red} name="arrow-forward-circle-sharp" size={56} />
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

function Main({ onLayoutRootView }) {
  const [meta, setMeta] = React.useState();
  const [isVisible, setIsVisible] = React.useState(false);
  const [cmsData, setCmsData] = React.useState();
  const [currentPage, setCurrentPage] = React.useState();
  const [pageData, setPageData] = React.useState({});
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    async function getMeta() {
      const { data: { data: { value }}} = await cmsAxios.get('/meta');
      setMeta(value);
      setCurrentPage('next_week');
    }

    if (!meta) {
      getMeta();
    }
  }, []);

  React.useEffect(() => {
    async function fetchData() {
      const { data: { data }} = await cmsAxios.get(`${currentPage}${meta.query}`);

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
      const { data: { data: { value }}} = await cmsAxios.get('/meta');
      setMeta(value);

      const { data: { data }} = await cmsAxios.get(`${currentPage}${meta.query}`);
      setPageData({ [currentPage]: data });

      setIsRefreshing(false);
    }

    fetchData();
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
      style={meta.styles.main.container}
    >
      <TopBar styles={meta.styles} />
      <Page
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        data={pageData[currentPage]}
        setPageData={setPageData}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        pages={meta.pages}
        styles={meta.styles}
      />
    </View>
  );
}
