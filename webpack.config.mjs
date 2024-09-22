import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    popup: ['./src/popup/index.tsx', './src/styles/popup-tailwind.css'],
    background: './src/background/background.ts',
    content: ['./src/content/content.tsx', './src/styles/content-tailwind.css'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          'postcss-loader'
        ],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public", to: "" },
        { from: "src/styles", to: "styles" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'styles/[name]-tailwind.css',
    }),
  ],
  devtool: 'inline-source-map',
  mode: 'production',
};