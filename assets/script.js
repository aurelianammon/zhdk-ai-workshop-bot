var socket = io();
const { createApp, ref, watch, reactive, watchEffect } = Vue;

createApp({
  data() {
    return {
      message: "Hello Vue!",
      text: "",
      jobs: [],
      date: null,
      context: "",
    };
  },
  computed: {
    // a computed getter
    filtered_jobs() {
      // `this` points to the component instance
      let data = this.jobs;
      for (let element of data) {
        element.state = new Date(element.date) > new Date(Date.now());
      }
      //   console.log(data);
      return data;
    },
  },
  methods: {
    add_job(e) {
      socket.emit("add date", [this.date, this.text]);
      //   this.update();
      this.text = "";
      this.date = null;
    },
    remove_job(id, e) {
      socket.emit("remove date", id);
      //   this.update();
    },
    update_context(e) {
      socket.emit("update context", this.context);
      //   this.update();
    },
    async update(e) {
      let tempData;
      await fetch("/jobs") // <-- this path surprises me
        .then((response) => response.json())
        .then((data) => (tempData = data));
      tempData.sort(function (a, b) {
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(a.date) - new Date(b.date);
      });
      this.jobs = tempData;
      await fetch("/context") // <-- this path surprises me
        .then((response) => response.json())
        .then((data) => (tempData = data));
      this.context = tempData;
    },
  },
  mounted() {
    this.update();
    socket.on("refresh", () => {
      this.update();
    });
  },
}).mount("#app");
