const path = require('path');
<<<<<<< HEAD
=======
const webpack = require('webpack');

require('dotenv').config();
>>>>>>> origin/ui-merged

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
<<<<<<< HEAD
    clean: true,
  },
  module: {
    rules: [
      // MapLibre GL JS ships CSS
=======
    clean: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.MAPBOX_TOKEN': JSON.stringify(process.env.MAPBOX_TOKEN || '')
    })
  ],
  module: {
    rules: [
>>>>>>> origin/ui-merged
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  experiments: {
<<<<<<< HEAD
    // Required for Rapier's WASM bundle
=======
>>>>>>> origin/ui-merged
    asyncWebAssembly: true,
  },
};
