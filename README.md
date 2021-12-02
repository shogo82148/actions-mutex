# actions-mutex

A GitHub Action for exclusive control.

## FEATURE

- avoid running multiple jobs concurrently across workflows

## SYNOPSIS

```yaml
on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: shogo82148/actions-mutex@v1
        with:
          key: deploy

      - run: ': some jobs that can not run concurrently'
```

## INPUTS

### key

The name of the critical section. The default is "lock".

### token

A GitHub Token. It must have a write access to the repository.
The default is "`${{ github.token }}`"

### repository

A repository for locking.
The default is the repository that the workflow runs on.

### prefix

Prefix of branch names for locking.
The default is "actions-mutex-lock/"

## OFFICIAL CONCURRENCY SUPPORT ON GITHUB ACTIONS

On April 19, 2021, GitHub launched beta support for limiting concurrency in the workflow files.

- [GitHub Actions: Limit workflow run or job concurrency](https://github.blog/changelog/2021-04-19-github-actions-limit-workflow-run-or-job-concurrency/)

Using this feature, the example in the SYNOPSIS section may be:

```yaml
on:
  push:
    branches:
      - main

# The job level concurrency
# https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#concurrency
concurrency: deploy

jobs:
  build:

    # The job level concurrency
    # https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idconcurrency
    concurrency: deploy

    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: ': some jobs that can not run concurrently'
```

Please read the latest document of [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions).

## HOW THE ACTION WORKS

As you known, Git rejects non-fast-forward updates.
The action uses it for locking.

The action tries to push a commit that contains a random string.
If the pushing succeeds, it means that no concurrent jobs run.

```
$ echo "$RANDOM" > lock.txt
$ git add lock.txt
$ git commit -m 'add lock files'
$ git push origin HEAD:actions-mutex-lock/lock
To https://github.com/shogo82148/actions-mutex
 * [new branch]      HEAD -> actions-mutex-lock/lock
```

If the pushing fails, it means that a concurrent job is now running.
The action will retry to push after some wait.

```
$ echo "$RANDOM" > lock.txt
$ git add lock.txt
$ git commit -m 'add lock files'
$ git push origin HEAD:actions-mutex-lock/lock
To https://github.com/shogo82148/actions-mutex
 ! [rejected]        HEAD -> actions-mutex-lock/lock (fetch first)
error: failed to push some refs to 'https://github.com/shogo82148/actions-mutex'
hint: Updates were rejected because the remote contains work that you do
hint: not have locally. This is usually caused by another repository pushing
hint: to the same ref. You may want to first integrate the remote changes
hint: (e.g., 'git pull ...') before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
```
