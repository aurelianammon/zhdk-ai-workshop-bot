var socket = io();
const { createApp, ref, watch, reactive, watchEffect } = Vue;

createApp({
  data() {
    return {
      message: "Hello Vue!",
      text: "",
      jobs: [],
      date: null,
      type: "TEXT",
      context: "",
      images: [],
      videos: [],
      FILE: null,
      name: "ASSISTANT",
      history: [],
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
      let text = marked.parseInline(this.text);
      socket.emit("add date", [this.date, text, this.type]);
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
    update_name(e) {
      socket.emit("update name", this.name);
      //   this.update();
    },
    remove_message(id, e) {
      socket.emit("remove message", id);
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
      await fetch("/name") // <-- this path surprises me
        .then((response) => response.json())
        .then((data) => (tempData = data));
      this.name = tempData;
      await fetch("/messages") // <-- this path surprises me
        .then((response) => response.json())
        .then((data) => (tempData = data));
      this.history = tempData;
      await fetch("/files") // <-- this path surprises me
        .then((response) => response.json())
        .then((data) => (tempData = data));
      this.images = tempData.images;
      this.videos = tempData.videos;
    },
    onSubmit() {
      // upload file
      if (this.$refs.fileupload.files[0] != undefined) {
        const formData = new FormData();
        formData.append("type", this.type);
        formData.append("file", this.$refs.fileupload.files[0]);
        fetch("/upload", {
          method: "POST",
          body: formData,
        }).then((res) => {
          console.log(res);
          this.$refs.fileupload.value = null;
        });
      }
      this.has_file = false;
    },
  },
  mounted() {
    this.update();
    socket.on("refresh", () => {
      this.update();
    });
  },
}).mount("#app");
