# Ecchi!

A domain-specific language for attribute-based access control.

## Example usage

In short:

> Define a hierarchy of access rules and check if a user has permissions to act on a resource.

Long version: **The project is still work in progress.**

1. define a hierarchy of access rules with its own domain-specific language
2. ???
3. profit

## Terms

* _concepts_ are equally-shaped compounds of data
  * concepts can inherit from other concepts
* _users_ are persons or identities - concepts whose access to subjects needs to be controlled
* _subjects_ are resources like business objects, API endpoints etc.
* _actions_ on subjects are the possible manipulations you can trigger as a user, when you have the right roles or permissions
  * actions can include other actions - they are modeled as a inheritance tree, like concepts are
* _roles_ can be seen as groups of users, each user can have multiple roles. A role cannhave certain permissions on actions for a certain subject
* _permissions_ reflect what actions a user is able to perform on subjects
* _access rules_ define access between users and subject actions - you can allow and forbid actions

## Contribution notes

### How to start?

For install, build and test simply use:

```bash
npm install
npm run build
npm test
```

### Package overview

![Dependencies](docs/dependencies.svg)

* `core` - the domain around access control
* `language` - the syntax and semantics of the access control language
* `cli` - a command-line interface for the transpiler
* `react` - visual components & hooks for React
* `typescript-plugin` - plugin for better TypeScript support
* `vscode-extension` - extension with language editor support
* `webpack-loader` - loader for Webpack
* `example` - example usage of the language

### Core implementation

Concepts and actions come in the shape of an inheritance hierarchy or tree graph.

Permissions are encoded as one bitmask per subject and per mode (allow or forbid) where each bit stands for on action that can be performed by the user.

Hierarchies of actions and bitmasks of actions behave differently:
* when you allow an action A, then every super action B will be allowed as well
* when you forbid an action F, then every sub action G will be allowed as well

Let's assume we have three actions ˋreadˋ, ˋwriteˋ and ˋdeleteˋ where ˋdeleteˋ is a sub-action of ˋwriteˋ, which is a sub-action of ˋreadˋ.
* if you allow writing, it will also allow reading
* if you forbid writing, it will also forbid deleting.

Nice, huh?!

## Why is this language called „Ecchi!“?

From [Wikipedia](https://en.wikipedia.org/wiki/Ecchi):

> Ecchi (エッチ, etchi) is a slang term in the Japanese language for playfully sexual actions. As an adjective, it is used with the meaning of "sexy", "dirty" or "naughty"; as a verb, ecchi suru (エッチする or as a noun, it is used to describe someone of lascivious behavior. It is softer than the Japanese word ero (エロ from Eros or "erotic"), and does not imply perversion in the way hentai does.

In this context, it functions as a noun, specifically referring to a scene from the OVA and manga series [3x3 Eyes](https://en.wikipedia.org/wiki/3%C3%973_Eyes). In this scene, the main character Yakumo inadvertently touches Pai's intimate area, prompting her to shout "Ecchi!" at him and slap him in the face.

Here is some illustration from the Manga:

![image](https://github.com/Lotes/ecchi-js/assets/1525964/254a0fbe-a328-4783-a002-b0d2bbdc1c3c)

As a result, this library is about protecting the private parts of your application ;-).

## License

[MIT](LICENSE.md)
