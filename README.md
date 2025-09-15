# World Cloud

---

Worldcloud is a _cloud services_ provider specializing in front-end _web application_ deployment.
Worldcloud utilizes the _Internet Computer_ to host static web applications directly ICP's network.
The vision is to bridge the gap between traditional DevOps and ICP infrastructure. By off-loading blockchain
related concepts to Worldcloud, developers are minimally exposed to new material and continue to use the
tools they are familiar with.

Screenshots:

![New Project](./documentation/assets/page_new_project.png =250x)
![My Projects](./documentation/assets/page_projects.png)
![Code Deployment](./documentation/assets/page_deployment.png)
![Project](./documentation/assets/page_project.png)

Live Website: [World Cloud](https://worldcloud.app)
Live Backend Canister: `7nopf-3qaaa-aaaam-aeeoq-cai`

## Introduction

World Cloud is a platform used by developers to get started with frontend web application hosting on the _Internet Computer_. With
it's unique approach towards sourcing, building, and publishing your website, World Cloud makes it possible for users of platforms
such as Vercel, Microsoft Azure, and AWS to easily bootstrap and host their favorite frontend application 100% on the _Internet Computer_.

- Ease-of-use: Flow and key concepts similar to products offered by _tech giants_ and majority of developers.
- Plug and play: Seemlessly build and publish web applications directly from your Github repo.
- Custom: Choose your favorite name for your site and link it to your project

### Technical Overview

The publishing process works as follows:

- a source branch is selected containing the frontend web application source code (reactjs, angular, plain vanilla)
- a custom workflow file is created and triggered with Github Actions
- artifacts are pulled and uploaded to an **asset canister** on the _IC_
- asset canister now serves the uploaded static content directly from the project's asset canister

![Technical Flow](./documentation/assets/technical-flow-high-level.svg)

### Freemium Plan Publishing Flow

Publishing a frontend application for free for a duration of 4 hours, 3 times per day.

![Freemium Flow](./documentation/assets/freemium-flow-high-level.png)

### Paid Plan Publishing Flow

Publishing a frontend web application to a project with a _paid plan_ means that the user owns the **asset canister** and
are the controllers of the canisters. The publishing flow is similar to the freemium plan.

![Paid Plan Flow](./documentation/assets/paid-flow-high-level.svg)

### Link Custom Subdomain Flow

When a project publishes a frontend application, the url used to access the application will typically follow the pattern:

`<canister-id>.icp0.io`

In order for users to access their sites from a custom domain like `mywebsite.worldcloud.app`, an add-on can be attached to
the project to allow registering the DNS records required to serve the frontend application from the user's chosen _subdomain_ name.

![Register DNS Flow](./documentation/assets/link-dns-high-level.png)

---

## Installation

Step-by-step guide to get a copy of the project up and running locally for development and testing.

### Prerequisites

- Node: `>=16.0.0`
- npm: `>=7.0.0`
- dfx: `0.29.1`
- mops

#### Node and npm

Follow the guide to install node on your machine.

```
https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
```

#### dfx

You will need the latest version of `dfx`

```
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

#### mops

```
npm i -g ic-mops
```
