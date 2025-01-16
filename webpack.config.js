const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    app: './src/renderer/app.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    hot: true,
    port: 8080,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
      }
    ],
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['markdown'], // We'll use markdown as base for mermaid syntax
      features: ['!gotoSymbol']
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/renderer/styles.css',
          to: 'styles.css',
        },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js'],
    alias: {
      'vscode': require.resolve('monaco-editor/esm/vs/editor/editor.api')
    }
  },
  devtool: 'source-map'
};