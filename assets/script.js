var socket = io();
const { createApp, ref, watch, reactive, watchEffect } = Vue;

createApp({
  data() {
    return {
      message: "Hello Vue!",
      text: "",
      jobs: [],
      date: null,
    };
  },
  methods: {
    add_job(e) {
      socket.emit("add date", [this.date, this.text]);
      this.getJobs();
      this.text = "";
      this.date = null;
    },
    remove_job(id, e) {
      socket.emit("remove date", id);
      this.getJobs();
    },
    async getJobs(e) {
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
    },
  },
  mounted() {
    this.getJobs();
  },
}).mount("#app");
