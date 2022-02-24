node {
  try {
    def version = null;
    def tag = null;
    def gitCommit = null;
    def imageName = null;
    def app;
    def repository = "coti-explorer-api";
    // This displays colors using the 'xterm' ansi color map.
    stage ('Checkout') {
      slackSend(message: ":male_mage:  Starting build  ${env.JOB_NAME} [${env.BUILD_NUMBER}] (${env.BUILD_URL}console)")
      checkout scm
      sh 'env';
      def major = readFile('major_version.txt').trim()
      gitCommit = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
      tag = "${env.BRANCH_NAME}.${major}.${env.BUILD_NUMBER}.${gitCommit}"
      version = "${major}.${env.BUILD_NUMBER}"
      sh "echo VERSION = \\'${version}\\' > version.js";
      sh "echo TAG = \\'${tag}\\' >> version.js";
      sh "echo BRANCH = \\'${env.BRANCH_NAME}\\' >> version.js";
      sh "echo GIT_COMMIT = \\'${gitCommit}\\' >> version.js";

      def version_in_file = readFile 'version.js'
      echo version_in_file
    }

    stage ('Build docker image') {
      echo "Building docker image";  
      imageName = "nexus.coti.io/repository/docker/${repository}:${tag}"
      app = docker.build(imageName)
    }
    stage ('Push Docker image') {
      docker.withRegistry("https://nexus.coti.io", 'nexus') {
        app.push()
        app.push("latest-${env.BRANCH_NAME}")
      }
    }
    stage ('Deploy') {
      if (env.BRANCH_NAME == "master"){
        // sh "~/scripts/upgrade_dev.sh ";
      }
      else if (env.BRANCH_NAME == "qa"){
        //sh "~/scripts/upgrade_qa.sh ";
      }
      else  {
       // sh "~/scripts/upgrade_dev.sh ";
      }
    }
    stage ('cleanup') {
      echo 'Cleanup:';
      sh "docker rmi -f ${imageName}";
    }

    stage('notify'){
      echo "sending notification to slack";
      slackSend( message: ":racing_motorcycle: build : ${env.JOB_NAME} [${env.BUILD_NUMBER}] (${env.BUILD_URL}console)");
    }
  } catch (e) {
    slackSend(color: 'danger', message: ":dizzy_face: FAILED: ${env.JOB_NAME} [${env.BUILD_NUMBER}] (${env.BUILD_URL}console)")
    throw e
    //simple test
  }

}
