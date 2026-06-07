package com.example.app;

import com.example.app.Helper;

public class App extends BaseService implements RunnableThing {
  public void run() {
    Helper.ping();
  }

  public boolean ready() {
    return true;
  }
}
