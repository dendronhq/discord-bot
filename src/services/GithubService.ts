import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import yaml from 'js-yaml';
import { Inbox } from '../components';

export type GithubServiceOpts = {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
};

let _singleton: GithubService | undefined;

export class GithubService {
  private octokit: Octokit;

  private owner: string;

  private repo: string;

  private branch: string;

  static instance() {
    if (!_singleton) {
      _singleton = new GithubService();
    }
    return _singleton;
  }

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    if (process.env.OWNER === undefined) {
      throw Error('No owner set.');
    }
    if (process.env.REPO === undefined) {
      throw Error('No repo set.');
    }
    if (process.env.BRANCH === undefined) {
      throw Error('No branch set.');
    }
    this.owner = process.env.OWNER;
    this.repo = process.env.REPO;
    this.branch = process.env.BRANCH;
  }

  private getServiceProps() {
    return {
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
    };
  }

  private async getCurrentCommit() {
    const { data: refData } = await this.octokit.git.getRef({
      ...this.getServiceProps(),
      ref: `heads/${this.branch}`,
    });

    const refCommitSHA = refData.object.sha;
    const { data: commitData } = await this.octokit.git.getCommit({
      ...this.getServiceProps(),
      commit_sha: refCommitSHA,
    });
    return {
      commitSHA: refCommitSHA,
      treeSHA: commitData.tree.sha,
    };
  }

  public async pushToDendron(opts: { destination: string; payload: string }) {
    const { destination, payload } = opts;

    const { commitSHA, treeSHA, content: currentContent } = await this.fetchNote({
      name: destination,
    });

    const inboxItem = new Inbox({ payload });
    const newContent = currentContent.concat(inboxItem.toString());

    // create a new blob with new content
    const newBlob = await this.octokit.rest.git.createBlob({
      ...this.getServiceProps(),
      content: newContent,
      encoding: 'utf-8',
    });

    // create a new tree containing the new blob
    const { data: createTreeData } = await this.octokit.git.createTree({
      ...this.getServiceProps(),
      tree: [
        {
          path: `notes/${destination}.md`,
          mode: '100644',
          type: 'blob',
          sha: newBlob.data.sha,
        },
      ],
      base_tree: treeSHA,
    });

    const { data: createCommitData } = await this.octokit.git.createCommit({
      ...this.getServiceProps(),
      // commit message is a random hex string
      message: crypto.randomBytes(4).toString('hex'),
      tree: createTreeData.sha,
      parents: [commitSHA],
    });

    // push
    await this.octokit.git.updateRef({
      ...this.getServiceProps(),
      ref: `heads/${this.branch}`,
      sha: createCommitData.sha,
      force: true,
    });
  }

  public async fetchNote(opts: {
    name: string;
  }) {
    const { name } = opts;
    const { commitSHA, treeSHA, content } = await this.fetchObject({
      query: `notes/${name}.md`,
    });
    return {
      commitSHA,
      treeSHA,
      content,
    };
  }

  public async fetchConfig() {
    const { commitSHA, treeSHA, content } = await this.fetchObject({
      query: 'dendron.yml',
    });
    const config = yaml.load(content);
    return {
      commitSHA,
      treeSHA,
      config,
    };
  }

  public async fetchObject(opts: {
    query: string;
  }) {
    const { query } = opts;
    // get the current commit's SHA and the tree's SHA
    const { commitSHA, treeSHA } = await this.getCurrentCommit();

    // get the tree recursively using the sha
    const { data: treeData } = await this.octokit.rest.git.getTree({
      ...this.getServiceProps(),
      tree_sha: treeSHA,
      recursive: 'true',
    });

    // find the destination in the tree
    const maybeDest = treeData.tree.find((item) => item.path === query);

    if (maybeDest === undefined) {
    // couldn't find destination. throw.
      throw Error('Cannot find destination');
    }

    if (maybeDest.sha === undefined) {
    // can a git object not have a sha?
      throw Error('Found destination doesn\'t have a SHA-1 hash');
    }

    const destSHA = maybeDest.sha;

    // get the destination's blob
    const { data: destBlobData } = await this.octokit.rest.git.getBlob({
      ...this.getServiceProps(),
      file_sha: destSHA,
    });

    // get the content of the destination's blob
    const content = Buffer.from(destBlobData.content, 'base64').toString(
      'utf-8',
    );

    return {
      commitSHA,
      treeSHA,
      content,
    };
  }
}
