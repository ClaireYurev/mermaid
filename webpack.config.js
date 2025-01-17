const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    app: './src/renderer/app.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: false, // Keep console.logs
          drop_debugger: true
        }
      }
    })],
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
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
      languages: ['markdown'],
      features: ['!gotoSymbol'],
      filename: '[name].worker.js'
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
  target: 'electron-renderer',
  devtool: 'source-map'
};