import { readFile, readdir } from 'fs'
import { fileURLToPath } from 'url'
import inquirer from 'inquirer'
import StoryblokClient from 'storyblok-js-client'
import path from 'path'

const filename = fileURLToPath(import.meta.url)
const directoryPath = path.join(path.dirname(filename), 'jsons')
const {
  update,
  storyblok_oauth_token,
  storyblok_space_id,
  storyblok_datasource_id,
  storyblok_total_datasources,
  storyblok_dimension_id,
} = await inquirer.prompt([
  { name: 'update', message: 'Does an existing datasoure needs to be updated?', default: true },
  { name: 'storyblok_oauth_token', message: 'Storyblok oauth token to have access to storyblok' },
  { name: 'storyblok_space_id', message: 'Id of storyblok space (inside url after spaces)' },
  { name: 'storyblok_datasource_id', message: 'Id of datasource type in storyblok (inside url after datasources)' },
  { name: 'storyblok_total_datasources', message: 'Amount of datasources that needs to be updated' },
  { name: 'storyblok_dimension_id', message: 'Storyblok dimension id' },
])

const Storyblok = new StoryblokClient({
  oauthToken: storyblok_oauth_token,
})

readdir(directoryPath, (err, files) => {
  if (
    (!storyblok_oauth_token,
    !storyblok_space_id,
    !storyblok_datasource_id,
    !storyblok_total_datasources,
    !storyblok_dimension_id)
  ) {
    return console.log('Did not fill the prompt with enough information')
  } else if (err) return console.log('Unable to scan directory: ' + err)

  files.forEach(file => {
    if (!file.includes('.json')) return console.log('Not a json file: ' + file)

    readFile(`jsons/${file}`, (err, data) => {
      if (err) throw err

      let file = JSON.parse(data)

      if (!update) {
        // insert datasorce for the first time
        for (const key in file) {
          if (file.hasOwnProperty(key)) {
            for (const nestedKey in file[key]) {
              if (file[key].hasOwnProperty(nestedKey)) {
                Storyblok.post(`spaces/${storyblok_space_id}/datasource_entries/`, {
                  datasource_entry: {
                    name: `${key}.${nestedKey}`,
                    value: file[key][nestedKey],
                    datasource_id: storyblok_datasource_id,
                  },
                }).catch(error => console.log(error))
              }
            }
          }
        }
      } else {
        // update multiple languages
        for (let i = 0; i < Math.ceil(Number(storyblok_total_datasources) / 25); i++) {
          Storyblok.get(`spaces/${storyblok_space_id}/datasource_entries?page=${i}`, {
            datasource_id: storyblok_datasource_id,
          })
            .then(res => {
              // fetch all the datasources to update
              res.data.datasource_entries.forEach(entry => {
                const split = entry.name.split('.')
                if (!file[split[0]]) return

                // update data source with translations
                Storyblok.put(`spaces/${storyblok_space_id}/datasource_entries/${entry.id}`, {
                  datasource_entry: {
                    name: entry.name,
                    value: entry.value,
                    dimension_value: file[split[0]][split[1]],
                  },
                  dimension_id: storyblok_dimension_id,
                }).catch(error => console.log(error))
              })
            })
            .catch(error => console.log(error))
        }
      }
    })
  })
})
