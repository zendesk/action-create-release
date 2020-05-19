
# GitHub Action - Releases API
This GitHub Action (written in JavaScript) wraps the  [Create a Release](https://developer.github.com/v3/repos/releases/#create-a-release) endpoint and [Auto Increment Tag Version ](#auto-increment---path-type---push-to-master) feature. Which allows to create tag automatically when pushed to the release branch. This is also an alternative to Samson Release functionality.

<a href="https://github.com/actions/create-release"><img alt="GitHub Actions status" src="https://github.com/zendesk/action-create-release/workflows/Tests/badge.svg"></a>

## Usage
### Pre-requisites
Create a workflow `.yml` file in your `.github/workflows` directory. An [example workflow](#example-workflow---create-a-release) is available below. For more information, reference the GitHub Help Documentation for [Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

### Inputs
For more information on these inputs, see the [API Documentation](https://developer.github.com/v3/repos/releases/#input)

| Parameter             | Description                                                                                | Required | Default      |
| -------------------   | ------------------------------------------------------------------------------------------ | -------- | ------------ |
| `tag_name`            | The name of the tag for this release.                            | N    | Auto Incremented |
| `release_name`        | The name of the release.                                         | N    |  TAG_NAME        |
| `body`                | Text describing the contents of the release                      | N    |  N/A             |
| `draft`               | `true` to create a draft (unpublished) release, `false` to create a published one.          | N        |  `false`       |
| `prerelease`          |  `true` to identify the release as a prerelease. `false` to identify the release as a full release. | N        |  `false`       |
| `prerelease_suffix`   | The suffix added to a prerelease tag, if none already exists.                 | N        | `beta`       |
| `auto_increment_type` | Used for auto-incrementing the tag version. One of (`major`, `minor`, `patch`, `prerelease`, `premajor`).  | N        | `patch` |



### Outputs
For more information on these outputs, see the [API Documentation](https://developer.github.com/v3/repos/releases/#response-4) for an example of what these outputs look like

| Parameter           | Description                                                                  | 
| ------------------- | ---------------------------------------------------------------------------- |
| `id`                | The release ID |
| `html_url`          | The URL users can navigate to in order to view the release. i.e. `https://github.com/octocat/Hello-World/releases/v1.0.0`  |
| `upload_url`        | The URL for uploading assets to the release, which could be used by GitHub Actions for additional uses, for example the [`@actions/upload-release-asset`](https://www.github.com/actions/upload-release-asset) GitHub Action|
| `previous_tag`      | The most recent tag found during auto incrementing the tag version.|
| `current_tag`       | The tag used to create a Release.|
                    

## Example workflow - Create a release

### Auto Increment - Patch type - Push to master
On every `push` to a `master` branch will create tag incrementally.

```yaml
on:
  push:
    branches:
      - master

name: Create Release

jobs:
  build:
    name: Create Release
    runs-on: ['self-hosted']
    steps:
      - name: Create Release
        id: create_release
        uses: zendesk/action-create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

***Sample Output:***
```
previous_tag: v5.0.3
current_tag:  v5.0.4
id:           123
upload_url:   https://uploads.github.com/repos/zendesk/Hello-World/releases/1/assets
html_url:     https://github.com/octocat/Hello-World/releases/v1.0.0
```

### Auto Increment types and outputs

| Type              | Previous Tag        | Current Tag         | 
| ----------------- | ------------------- | ------------------- |
| major             | `v5.0.1`            | `v6.0.0`            |
| minor             | `v5.0.1`            | `v5.1.1`            |
| patch             | `v5.0.1`            | `v5.0.2`            |
| prerelease        | `v5.0.1`            | `v5.0.2-beta.0`     |
| premajor          | `v5.0.1`            | `v6.0.1-beta.0`     |


### Tag as parameter
On every `push` to a tag matching the pattern `v*`, [create a release](https://developer.github.com/v3/repos/releases/#create-a-release):

```yaml
on:
  push:
    # Sequence of patterns matched against refs/tags
    tags:
      - 'v*' # Push events to matching v*, i.e. v1.0, v20.15.10

name: Create Release

jobs:
  build:
    name: Create Release
    runs-on: ['self-hosted']
    steps:
      - name: Create Release
        id: create_release
        uses: zendesk/action-create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # This token is provided by Actions, you do not need to create your own token
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Changes in this Release
            - First Change
            - Second Change
          draft: false
          prerelease: false
```

This will create a [Release](https://help.github.com/en/articles/creating-releases), as well as a [`release` event](https://developer.github.com/v3/activity/events/types/#releaseevent), which could be handled by a third party service, or by GitHub Actions for additional uses, for example the [`@actions/upload-release-asset`](https://www.github.com/actions/upload-release-asset) GitHub Action. This uses the `GITHUB_TOKEN` provided by the [virtual environment](https://help.github.com/en/github/automating-your-workflow-with-github-actions/virtual-environments-for-github-actions#github_token-secret), so no new token is needed.

## Contributing
We would love you to contribute to `@actions/create-release`, pull requests are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## License
The scripts and documentation in this project are released under the [MIT License](LICENSE)
