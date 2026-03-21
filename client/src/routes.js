import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Loader } from "./components/common/Loader";
const App = lazy(() => import("./App"));
const PrivateView = lazy(() => import("./components/PrivateView"));
const MeetingRoom = lazy(() => import("./components/MeetingRoom"));

// const ValidatedRoute = ({ component: Component, ...rest }) => {
//   const { state } = useContext(Store);
//   return <Route {...rest} render={props => (state.isLoggedIn ? <Component {...props} /> : <Redirect to="/" />)} />;
// };

export const Routes = () => (
  <Router>
    <Suspense fallback={<Loader />}>
      <Switch>
        <Route exact path="/" component={App} />
        <Route exact path="/private" component={PrivateView} />
        <Route exact path="/private/:meetingId" component={MeetingRoom} />
        <Route exact path="/:meetingId" component={MeetingRoom} />
      </Switch>
    </Suspense>
  </Router>
);
