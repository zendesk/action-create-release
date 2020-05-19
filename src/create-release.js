const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const semver = require('semver');
const process = require('process');

const octokit = new GitHub(process.env.GITHUB_TOKEN);
const { owner, repo } = context.repo;
const Semantic = {
  Major: 'major',
  Minor: 'minor',
  Patch: 'patch',
  Premajor: 'premajor',
  Prerelease: 'prerelease'
};
const prerelease = core.getInput('prerelease', { required: false }) === 'true';

// Check string is null
function isNullString(string) {
  return !string || string.length === 0 || string === 'null' || string === 'undefined';
}

// If there is no previous tag, Then the intial tag will be used
function initialTag(tag) {
  const suffix = core.getInput('prerelease_suffix');
  const newTag = prerelease ? `${tag}-${suffix}` : tag;

  return `${newTag}.0`;
}

async function existingTags() {
  const { data: refs } = await octokit.git.listMatchingRefs({
    owner,
    repo,
    ref: 'tags'
  });

  return refs.reverse();
}

function semanticVersion(tag) {
  try {
    const [version, pre] = tag.split('-', 2);
    const sem = semver.parse(semver.coerce(version));

    if (!isNullString(pre)) {
      sem.prerelease = semver.prerelease(`0.0.0-${pre}`);
    }

    return sem;
  } catch (_) {
    // semver will return null if it fails to parse, maintain this behavior in our API
    return null;
  }
}

function determinePrereleaseName(semTag) {
  const hasExistingPrerelease = semTag.prerelease.length > 0;

  if (hasExistingPrerelease) {
    const [name, _] = semTag.prerelease;
    return name;
  }
  return core.getInput('prerelease_suffix') || 'beta';
}

function computeNextSemantic(semTag) {
  try {
    const type = core.getInput('version_type') || Semantic.Patch;
    const preName = determinePrereleaseName(semTag);

    switch (type) {
      case Semantic.Major:
      case Semantic.Minor:
      case Semantic.Patch:
      case Semantic.Premajor:
      case Semantic.Prerelease:
        return `${semTag.options.tagPrefix}${semver.inc(semTag, type, preName)}`;
      default:
        core.setFailed(
          `Unsupported semantic version type ${type}. Must be one of (${Object.values(Semantic).join(', ')})`
        );
    }
  } catch (error) {
    core.setFailed(`Failed to compute next semantic tag: ${error}`);
  }
  return null;
}

async function computeLastTag() {
  const recentTags = await existingTags();
  if (recentTags.length < 1) {
    return null;
  }
  return recentTags.shift().ref.replace('refs/tags/', '');
}

async function computeNextTag() {
  const lastTag = await computeLastTag();

  // Handle zero-state where no tags exist for the repo
  if (!lastTag) {
    return initialTag('v1.0.0');
  }

  core.info(`Computing the next tag based on: ${lastTag}`);
  core.setOutput('previous_tag', lastTag);

  const semTag = semanticVersion(lastTag);

  if (semTag == null) {
    core.setFailed(`Failed to parse tag: ${lastTag}`);
    return null;
  }
  semTag.options.tagPrefix = lastTag.startsWith('v') ? 'v' : '';

  return computeNextSemantic(semTag);
}

async function run() {
  try {
    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const tagName = core.getInput('tag_name', { required: false });
    // Use predefined tag or calculate automatic next tag
    const tag = isNullString(tagName) ? await computeNextTag() : tagName.replace('refs/tags/', '');

    const releaseName = core.getInput('release_name', { required: false });
    const release = isNullString(releaseName) ? tag : releaseName.replace('refs/tags/', '');

    const body = core.getInput('body', { required: false });
    const draft = core.getInput('draft', { required: false }) === 'true';

    // Create a release
    // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
    const createReleaseResponse = await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: release,
      body,
      draft,
      prerelease
    });

    // Get the ID, html_url, and upload URL for the created Release from the response
    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
    } = createReleaseResponse;

    // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('current_tag', tag);
    core.setOutput('id', releaseId);
    core.setOutput('html_url', htmlUrl);
    core.setOutput('upload_url', uploadUrl);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
