"use strict";

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.pace;
  }
}

// const run1 = new Running([39,-12], 5.2, 24, 128);
// const cycling1 = new Running([39,-12], 27, 95, 523);
// console.log(run1, cycling1);

////////////////////////
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
//Application Architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #formEditFlag = 0;

  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener("submit", (e) => {
      if (this.#formEditFlag == 0) this._newWorkout.bind(this)(e);
      if (this.#formEditFlag == 1) this._saveEditedWorkout.bind(this)(e);
    });
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", (e) => {
      if (e.target.closest(".workout")) this._moveToPopup.bind(this)(e);
      if (e.target.closest(".workout__delete"))
        this._deleteWorkout.bind(this)(e);
      if (e.target.closest(".workout__edit")) this._editWorkout.bind(this)(e);
    });

    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Escape") {
          form.classList.add("hidden");
        }
      }.bind(this)
    );

  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get location");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // console.log(
    //   `https://www.google.com/maps/@${latitude},${longitude},10z?entry=ttu`
    // );

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    // console.log(this.#map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords)
    //   .addTo(this.#map)
    //   .bindPopup("A pretty CSS popup.<br> Easily customizable.")
    //   .openPopup();

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((workout) => {
      this._renderWorkoutMarker(workout);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _hideForm() {
    //Empty the inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs has to be positive");

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs has to be positive");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Clear input fields + Hide form
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          content: `Type: ${
            workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
          }<br>Distance: ${workout.distance}<br>Duration: ${workout.duration}`,
        })
      )
      .openPopup();

    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
        <li id="${workout.id}" class="workout workout--${
      workout.type
    }" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="workout__edit"><i class='far fa-edit'></i></button>
          <button class="workout__delete"><i class='fa fa-trash-o'></i></button>

          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === "running") {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;
    }
    if (workout.type === "cycling") {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🚵‍♀️</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
    }

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using public interface
    // workout.click();
    // console.log(workout.clicks);
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    const T = this;

    this.#workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
  _deleteWorkout(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    //Find workout and its Index
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    const workoutIndex = this.#workouts.indexOf(workout);

    //remove workout and workout element
    this.#workouts.splice(workoutIndex, 1);
    workoutEl.remove();

    localStorage.setItem("workouts", JSON.stringify(this.#workouts));

    //remove marker
    this.#markers[workoutIndex].remove();
    this.#markers.splice(workoutIndex, 1);
  }
  _editWorkout(e) {
    console.log("Ready to edit");
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    //Find workout and its Index
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    const workoutIndex = this.#workouts.indexOf(workout);
    console.log(workout);
    console.log(workoutIndex);

    this._showForm();
    this._fillForm(workout);
  }
  _fillForm(workout) {
    console.log("hello");

    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.type === "running") {
      inputCadence.value = workout.cadence;

      if (inputType.value == "cycling") this._toggleElevationField();
      inputType.value = "running";
    }
    if (workout.type === "cycling") {
      inputElevation.value = workout.elevationGain;

      if (inputType.value == "running") this._toggleElevationField();
      inputType.value = "cycling";
    }
    this.workout = workout;
    this.#formEditFlag = 1;
  }
  _saveEditedWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    //Find workout Index
    const workoutIndex = this.#workouts.indexOf(this.workout);
    const oldWorkout = this.#workouts[workoutIndex];
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let newWorkout;

    // If workout running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs has to be positive");

      newWorkout = new Running(
        this.workout.coords,
        distance,
        duration,
        cadence
      );
    }
    // If workout cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs has to be positive");
      newWorkout = new Cycling(
        this.workout.coords,
        distance,
        duration,
        elevation
      );
    }
    this.#workouts[workoutIndex] = newWorkout;
    this.#formEditFlag = 0;
    this._hideForm();
    this._setLocalStorage();

    const oldWorkoutElement = document.getElementById(oldWorkout.id);
    oldWorkoutElement.remove();

    this._renderWorkout(newWorkout);
  }
}

const app = new App();
