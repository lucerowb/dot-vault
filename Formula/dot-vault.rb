class DotVault < Formula
  desc "CLI for DotVault — secure environment variable management"
  homepage "https://github.com/lucerowb/dot-vault/tree/main/packages/cli"
  url "https://github.com/lucerowb/dot-vault/releases/download/v0.2.7/dotvault-cli-0.2.7.npm.tgz"
  version "0.2.7"
  sha256 "ddb322bd9c21bd04de066eb1f385de3740818e18e949febd88639cd735bc106c"
  license "MIT"

  livecheck do
    url :stable
    strategy :github_latest
  end

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/dv --version")
  end
end
