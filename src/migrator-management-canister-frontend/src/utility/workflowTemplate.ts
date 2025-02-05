export const generateWorkflowTemplate = (srcPath: string = '.', branch: string = '') => `
name: Build and Deploy to ICP
on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch to build from'
        required: true
        default: '${branch}'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.inputs.branch }}
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Find Package JSON
        id: find-package-json
        run: |
          ${srcPath === '.' ? '' : `cd ${srcPath}`}
          pwd
          ls -la
          if [ ! -f "package.json" ]; then
            echo "::error::No package.json found in specified path"
            exit 1
          fi
          
      - name: Detect Package Manager
        id: detect-package-manager
        working-directory: ${srcPath}
        run: |
          if [ -f "yarn.lock" ]; then
            echo "manager=yarn" >> $GITHUB_OUTPUT
            echo "command=install" >> $GITHUB_OUTPUT
          elif [ -f "pnpm-lock.yaml" ]; then
            echo "manager=pnpm" >> $GITHUB_OUTPUT
            echo "command=install" >> $GITHUB_OUTPUT
          elif [ -f "package-lock.json" ]; then
            echo "manager=npm" >> $GITHUB_OUTPUT
            echo "command=ci" >> $GITHUB_OUTPUT
          else
            echo "manager=npm" >> $GITHUB_OUTPUT
            echo "command=install" >> $GITHUB_OUTPUT
          fi
          
      - name: Install Dependencies
        working-directory: ${srcPath}
        run: \${{ steps.detect-package-manager.outputs.manager }} \${{ steps.detect-package-manager.outputs.command }} --legacy-peer-deps
        
      - name: Build
        working-directory: ${srcPath}
        env:
          CI: false
        run: |
          echo "Starting build process..."
          echo "Current directory: $(pwd)"
          echo "Checking package.json scripts:"
          cat package.json | grep '"scripts"' -A 10
          
          # Remove prebuild script to skip dfx commands
          npm pkg delete scripts.prebuild
          
          echo "Modified package.json scripts:"
          cat package.json | grep '"scripts"' -A 10
          
          # Detect build tool from package.json
          if grep -q '"vite"' package.json; then
            echo "Detected Vite project"
            BUILD_DIR="dist"
          elif grep -q '"react-scripts"' package.json; then
            echo "Detected Create React App project"
            BUILD_DIR="build"
          else
            echo "Using default build directory"
            BUILD_DIR="dist"
          fi
          
          echo "Build directory will be: $BUILD_DIR"
          
          echo "Running build command..."
          CI=false \${{ steps.detect-package-manager.outputs.manager }} run build --verbose
          
          echo "Checking for build output..."
          if [ -d "$BUILD_DIR" ]; then
            echo "Found build directory: $BUILD_DIR"
            echo "Directory structure:"
            tree $BUILD_DIR || ls -R $BUILD_DIR
            echo "Directory sizes:"
            du -sh $BUILD_DIR/*
          else
            echo "Error: Build directory $BUILD_DIR not found"
            echo "Checking current directory contents:"
            ls -la
            exit 1
          fi
          
          # Export the build directory for use in later steps
          echo "build_dir=$BUILD_DIR" >> $GITHUB_OUTPUT
        
      - name: Create Build Directory
        id: create_build
        working-directory: ${srcPath}
        run: |
          echo "Current directory: $(pwd)"
          
          # Detect build directory directly
          if [ -d "dist" ]; then
            BUILD_DIR="dist"
          elif [ -d "build" ]; then
            BUILD_DIR="build"
          else
            echo "Error: Neither dist nor build directory found!"
            ls -la
            exit 1
          fi
          
          echo "Found build directory: $BUILD_DIR"
          
          if [ -z "$(ls -A $BUILD_DIR)" ]; then
            echo "Error: $BUILD_DIR directory is empty!"
            exit 1
          fi
          
          echo "Build directory contents:"
          ls -la $BUILD_DIR
          
          # Export the build directory for use in later steps
          echo "build_dir=$BUILD_DIR" >> $GITHUB_OUTPUT
        
      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-artifact
          path: ${srcPath === '.' ? '${{ steps.create_build.outputs.build_dir }}/**/*' : `${srcPath}/\${{ steps.create_build.outputs.build_dir }}/**/*`}
          retention-days: 1
`.trim();