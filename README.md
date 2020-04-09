# Pomodoro Timer Server
The server backend for [pomodoro.peter.vashevko.com](https://pomodoro.peter.vashevko.com).

## Installation and Use
This server requires Node.js to function.
Run the `yarn install` or `npm install` command to install the dependencies. This server runs websockets over TLS, so you will need to provide a valid SSL certificate. Rename the file called `config_example.json` to `config.json` and fill in the fields.
Then, run `node index.js` to start the server.
The server will run on the port specified in `config.json` You will need to forward this port on your router and enter the URL to your installation into the timer.

## License
This project is licensed under the MIT license.
