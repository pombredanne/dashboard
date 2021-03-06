/* vim: set expandtab sw=4 ts=4: */
/**
 * Analyse and visualise trend data using the Keen.io API.
 *
 * Copyright (C) 2014-2016 Dieter Adriaenssens <ruleant@users.sourceforge.net>
 *
 * This file is part of buildtimetrend/dashboard
 * <https://github.com/buildtimetrend/dashboard/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// Timeframe button constants
var BUTTON_COUNT_NAME = 'count';
var BUTTON_COUNT_DEFAULT = 'jobs';
var BUTTONS_COUNT = {
    'builds': {
        'caption': 'Builds',
        'keenEventCollection': 'build_jobs',
        'keenTargetProperty': 'job.build'
    },
    'jobs': {
        'caption': 'Build jobs',
        'keenEventCollection': 'build_jobs',
        'keenTargetProperty': 'job.job'
    }
};

var countButtons = new ButtonClass(
    BUTTON_COUNT_NAME,
    BUTTONS_COUNT,
    BUTTON_COUNT_DEFAULT
);
countButtons.onClick = function() { updateCountCharts(); };

var chartBuildsPerProject, chartBuildsPerProjectPie;

/* Merge values into a hashtable, add results if key exists */
function mergeSum(object, mergedHashTable, propertyName) {
    var key = object[propertyName];
    if (mergedHashTable[key]) {
        mergedHashTable[key].result += object.result;
    } else {
        mergedHashTable[key] = object;
    }
}

function initCharts() {
    // initialize timeframe buttons
    timeframeButtons.initButtons();
    countButtons.initButtons();

    // get Update Period settings
    var updatePeriod = getUpdatePeriod();

    var keenMaxAge = updatePeriod.keenMaxAge;
    var keenTimeframe = updatePeriod.keenTimeframe;
    var keenInterval = updatePeriod.keenInterval;

    var PROJECT_NAME_PROPERTY = 'buildtime_trend.project_name';

    // get count button target
    var countSettings = countButtons.getCurrentButton();

    // display charts
    $('#charts').show();

    /* Total unique repos */
    var metricTotalRepos = new ChartClass();

    // create query
    metricTotalRepos.queries.push(new Keen.Query('count_unique', {
        eventCollection: 'build_jobs',
        targetProperty: 'job.repo',
        timezone: TIMEZONE_SECS,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge
    }));
    chartsTimeframe.push(metricTotalRepos);

    // draw chart
    metricTotalRepos.chart = new Dataviz()
        .el('#metric_unique_repos')
        .type('metric')
        .title('Unique repos')
        .colors([BLUE])
        .attributes({
            chartOptions: {prettyNumber: false}
        })
        .prepare();

    metricTotalRepos.request = function() {
        client.run(
            metricTotalRepos.queries,
            function(err, res){
                if (err) {
                    // Display the API error
                    metricTotalRepos.chart.error(err.message);
                } else {
                    metricTotalRepos.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(metricTotalRepos);

    /* Total build jobs */
    var metricTotalBuildJobs = new ChartClass();

    // create query
    metricTotalBuildJobs.queries.push(new Keen.Query('count', {
        eventCollection: 'build_jobs',
        timezone: TIMEZONE_SECS,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge
    }));
    chartsTimeframe.push(metricTotalBuildJobs);

    // draw chart
    metricTotalBuildJobs.chart = new Dataviz()
        .el('#metric_total_build_jobs')
        .type('metric')
        .title('Total build jobs')
        .prepare();

    metricTotalBuildJobs.request = function() {
        client.run(
            metricTotalBuildJobs.queries,
            function(err, res){
                if (err) {
                    // Display the API error
                    metricTotalBuildJobs.chart.error(err.message);
                } else {
                    metricTotalBuildJobs.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(metricTotalBuildJobs);

    /* Total sub stages */
    var metricTotalSubStages = new ChartClass();

    // create query
    metricTotalSubStages.queries.push(new Keen.Query('count', {
        eventCollection: 'build_substages',
        timezone: TIMEZONE_SECS,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge
    }));
    chartsTimeframe.push(metricTotalSubStages);

    // draw chart
    metricTotalSubStages.chart = new Dataviz()
        .el('#metric_total_substages')
        .type('metric')
        .title('Total substages')
        .prepare();

    metricTotalSubStages.request = function() {
        client.run(
            metricTotalSubStages.queries,
            function(err, res){
                if (err) {
                    // Display the API error
                    metricTotalSubStages.chart.error(err.message);
                } else {
                    metricTotalSubStages.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(metricTotalSubStages);

    /* Total events */
    var metricTotalEvents = new ChartClass();

    // draw chart
    metricTotalEvents.chart = new Dataviz()
        .el('#metric_total_events')
        .type('metric')
        .title('Total events')
        .colors([LAVENDER])
        .prepare();

    // combine result of total build jobs and total substages
    metricTotalEvents.request = function() {
        client.run(
            metricTotalBuildJobs.queries.concat(metricTotalSubStages.queries),
            function(err, res) {
                if (err) {
                    // Display the API error
                    metricTotalEvents.chart.error(err.message);
                } else {
                    var totalEvents = 0;
                    $.each(res, function() {
                        totalEvents += this.result;
                    });
                    metricTotalEvents.chart
                        .data({result: totalEvents})
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(metricTotalEvents);

    /* Unique repos */
    var chartUniqueRepos = new ChartClass();

    // create query
    chartUniqueRepos.queries.push(new Keen.Query('count_unique', {
        eventCollection: 'build_jobs',
        targetProperty: 'job.repo',
        groupBy: 'job.build_matrix.language',
        interval: keenInterval,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge,
        timezone: TIMEZONE_SECS
    }));
    chartsTimeframe.push(chartUniqueRepos);
    chartsInterval.push(chartUniqueRepos);

    // draw chart
    chartUniqueRepos.chart = new Dataviz()
        .el('#chart_unique_repos')
        .title('Unique project repositories')
        .type('area')
        .height(400)
        .attributes({
            stacked: true
        })
        .prepare();

    chartUniqueRepos.request = function() {
        client.run(
            chartUniqueRepos.queries,
            function(err, res) {
                if (err) {
                    // Display the API error
                    chartUniqueRepos.chart.error(err.message);
                } else {
                    chartUniqueRepos.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(chartUniqueRepos);

    /* Builds per project */
    chartBuildsPerProject = new ChartClass();

    // create query
    chartBuildsPerProject.queries.push(new Keen.Query('count_unique', {
        eventCollection: countSettings.keenEventCollection,
        targetProperty: countSettings.keenTargetProperty,
        groupBy: PROJECT_NAME_PROPERTY,
        interval: keenInterval,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge,
        timezone: TIMEZONE_SECS
    }));
    chartsTimeframe.push(chartBuildsPerProject);
    chartsInterval.push(chartBuildsPerProject);

    // draw chart
    chartBuildsPerProject.chart = new Dataviz()
        .el('#chart_builds_per_project')
        .title(countSettings.caption + ' per project')
        .type('bar')
        .height(400)
        .attributes({
            stacked: true
        })
       .prepare();

    chartBuildsPerProject.request = function() {
        client.run(
            chartBuildsPerProject.queries,
            function(err, res) {
                if (err) {
                    // Display the API error
                    chartBuildsPerProject.chart.error(err.message);
                } else {
                    chartBuildsPerProject.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(chartBuildsPerProject);

    /* Builds per project (piechart) */
    chartBuildsPerProjectPie = new ChartClass();

    // create query
    chartBuildsPerProjectPie.queries.push(new Keen.Query('count_unique', {
        eventCollection: countSettings.keenEventCollection,
        targetProperty: countSettings.keenTargetProperty,
        groupBy: PROJECT_NAME_PROPERTY,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge,
        timezone: TIMEZONE_SECS
    }));
    chartsTimeframe.push(chartBuildsPerProjectPie);

    // draw chart
    chartBuildsPerProjectPie.chart = new Dataviz()
        .el('#chart_builds_per_project_pie')
        .title(countSettings.caption + ' per project')
        .type('pie')
        .height(400)
        .prepare();

    chartBuildsPerProjectPie.request = function() {
        client.run(
            chartBuildsPerProjectPie.queries,
            function(err, res) {
                if (err) {
                    // Display the API error
                    chartBuildsPerProjectPie.chart.error(err.message);
                } else {
                    chartBuildsPerProjectPie.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(chartBuildsPerProjectPie);

    /* Substages per project */
    var chartStagesPerProject = new ChartClass();

    // create query
    chartStagesPerProject.queries.push(new Keen.Query('count', {
        eventCollection: 'build_substages',
        groupBy: PROJECT_NAME_PROPERTY,
        interval: keenInterval,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge,
        timezone: TIMEZONE_SECS
    }));
    chartsTimeframe.push(chartStagesPerProject);
    chartsInterval.push(chartStagesPerProject);

    // draw chart
    chartStagesPerProject.chart = new Dataviz()
        .el('#chart_stages_per_project')
        .title('Substages per project')
        .type('bar')
        .height(400)
        .attributes({
            stacked: true
        })
       .prepare();

    chartStagesPerProject.request = function() {
        client.run(
            chartStagesPerProject.queries,
            function(err, res) {
                if (err) {
                    // Display the API error
                    chartStagesPerProject.chart.error(err.message);
                } else {
                    chartStagesPerProject.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(chartStagesPerProject);

    /* Substages per project (piechart)*/
    var chartStagesPerProjectPie = new ChartClass();

    // create query
    chartStagesPerProjectPie.queries.push(new Keen.Query('count', {
        eventCollection: 'build_substages',
        groupBy: PROJECT_NAME_PROPERTY,
        timeframe: keenTimeframe,
        maxAge: keenMaxAge,
        timezone: TIMEZONE_SECS
    }));
    chartsTimeframe.push(chartStagesPerProjectPie);

    // draw chart
    chartStagesPerProjectPie.chart = new Dataviz()
        .el('#chart_stages_per_project_pie')
        .title('Substages per project')
        .type('pie')
        .height(400)
        .prepare();

    chartStagesPerProjectPie.request = function() {
        client.run(
            chartStagesPerProjectPie.queries,
            function(err, res) {
                if (err) {
                    // Display the API error
                    chartStagesPerProjectPie.chart.error(err.message);
                } else {
                    chartStagesPerProjectPie.chart
                        .data(res)
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(chartStagesPerProjectPie);

    /* Total events per project */
    var chartEventsPerProject = new ChartClass();

    // draw chart
    chartEventsPerProject.chart = new Dataviz()
        .el('#chart_total_events')
        .title('Total events per project')
        .type('bar')
        .height(400)
        .attributes({
            stacked: true
        })
        .prepare();

    chartEventsPerProject.request = function() {
        client.run(
            chartStagesPerProject.queries.concat(chartBuildsPerProject.queries),
            function(err, res) {
                if (err) {
                    // Display the API error
                    chartEventsPerProject.chart.error(err.message);
                } else {
                    var result1 = res[0].result;
                    var mergedResult = [];
                    var i=0;

                    // Loop over X-axis values
                    while (i < result1.length) {
                        var mergedHash = {};
                        // loop over query results
                        $.each(res, function() {
                            // loop over series values
                            $.each(this.result[i].value, function() {
                                mergeSum(this, mergedHash, PROJECT_NAME_PROPERTY);
                            });
                        });

                        // construct merged data set
                        mergedResult[i]={
                            timeframe: result1[i].timeframe,
                            value: removeKeys(mergedHash)
                        };
                        i++;
                    }

                    chartEventsPerProject.chart
                        .data({result: mergedResult})
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(chartEventsPerProject);

    /* Total events per project (piechart)*/
    var chartEventsPerProjectPie = new ChartClass();

    // draw chart
    chartEventsPerProjectPie.chart = new Dataviz()
        .el('#chart_total_events_pie')
        .title('Total events per project')
        .type('pie')
        .height(400)
        .prepare();

    chartEventsPerProjectPie.request = function() {
        client.run(
            chartStagesPerProjectPie.queries.concat(chartBuildsPerProjectPie.queries),
            function(err, res) {
                if (err) {
                    // Display the API error
                    chartEventsPerProjectPie.chart.error(err.message);
                } else {
                    /* Merge series (sum results)
                     *
                     * First merge the results of the different series into
                     * a key-value list, using the key name to check if an
                     * object already exists.
                     * Add the value to the list if it doesn't exist, if it does exist,
                     * add its value to the value of the existing value.
                     * Secondly, remove the key name from the list,
                     * by inserting every value into an array.
                     *
                     * Using a key-value list will be much faster (O(n)),
                     * than iterating all existing objects to check if the name is the same (O(n^2))
                     */
                    // use named keys to lookup if object already exists
                    var mergedHash = {};
                    $.each(res, function() {
                        $.each(this.result, function() {
                            mergeSum(this, mergedHash, PROJECT_NAME_PROPERTY);
                        });
                    });

                    chartEventsPerProjectPie.chart
                        .data({result: removeKeys(mergedHash)})
                        .render();
                }
            }
        );
    };
    chartsUpdate.push(chartEventsPerProjectPie);

    updateCharts();
}

/**
 * Refresh count charts eventCollection and targetProperty selected by countButtons.
 */
function updateCountCharts() {
  // get count button target
  var countSettings = countButtons.getCurrentButton();

  // update queries
  chartBuildsPerProject.queries[0].set({
    eventCollection: countSettings.keenEventCollection,
    targetProperty: countSettings.keenTargetProperty
  });
  chartBuildsPerProjectPie.queries[0].set({
    eventCollection: countSettings.keenEventCollection,
    targetProperty: countSettings.keenTargetProperty
  });

  chartBuildsPerProject.chart.title(countSettings.caption + ' per project');
  chartBuildsPerProjectPie.chart.title(countSettings.caption + ' per project');

  // refresh all query requests
  chartBuildsPerProject.chart.prepare();
  chartBuildsPerProject.request();
  chartBuildsPerProjectPie.chart.prepare();
  chartBuildsPerProjectPie.request();
}

// initialize page
$(document).ready(function() {
    updateTitle();
    initLinks();
    initMessage();
    populateProjects();

    if (!isEmpty(keenConfig.projectId) && !isEmpty(keenConfig.readKey)) {
        initCharts();
    }
});
